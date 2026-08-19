import express, {Request, Response } from "express";
import clients from "../models/client.js";

const router = express.Router();



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
