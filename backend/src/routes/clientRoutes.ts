import express, {Request, Response } from "express";
import clients from "../models/client.js";
import clientBriefings from "../models/clientBriefing.js";

const router = express.Router();

router.post("/api/client/briefing", async (req: Request, res: Response) => {
    try {
      const { login, password, briefing } = req.body ?? {};

      if (typeof login !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      if (!briefing || typeof briefing !== "object" || Array.isArray(briefing)) {
        return res.status(400).json({ message: "Briefing inválido" });
      }

      const client = await clients.findOne({ login, password });
      if (!client) {
        return res.status(401).json({ message: "Acesso negado. Login ou senha incorretos." });
      }

      const clientData = client.toObject();
      const briefingDocument = {
        clientId: client._id,
        clientLogin: client.login,
        briefingDefinition: clientData.briefing,
        responses: briefing,
        submittedAt: new Date()
      };

      console.log(
        "Briefing recebido para persistência:",
        JSON.stringify(briefingDocument, null, 2)
      );

      const savedBriefing = await clientBriefings.findOneAndUpdate(
        { clientId: client._id },
        {
          $set: briefingDocument
        },
        { upsert: true, new: true, runValidators: true }
      );

      client.hasFilledBriefing = true;
      await client.save();

      return res.status(200).json({
        message: "Briefing enviado com sucesso",
        briefingId: savedBriefing._id
      });
    } catch (error: unknown) {
      console.error("Erro ao salvar briefing do cliente:", error);
      return res.status(500).json({ message: "Erro ao salvar briefing" });
    }
});



// Rota de login de administrador
router.post("/api/client/login", async (req, res) => {
    try {
      const {login, password} = req.body;

      if (!login || !password) {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      const admin = await clients.findOne({login: login, password: password});
      
      // const test = await admins.find()
      // console.log(test)
      if (!admin) {
        console.log(login, password)
        return res.status(401).json({ message: "Login ou senha incorretos" });
      }

      res.status(200).json({
        message: "Login bem-sucedido",
        name: admin.name,
        hasFilledBriefing: admin.hasFilledBriefing,
        briefingObject: admin.briefing,
        clientObject: {
          id: admin._id,
          name: admin.name,
          hasFilledBriefing: admin.hasFilledBriefing
        }
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao buscar admin", error: error.message });
    }
  });

export default router;
