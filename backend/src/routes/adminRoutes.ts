import express, {Request, Response } from "express";
import mongoose from "mongoose";
import admins from "../models/admin.js";
import clients from "../models/client.js";
import { BriefingObject } from "../models/briefing.js";

const router = express.Router();



// Rota de login de administrador
router.post("/api/admin/login", async (req, res) => {
    try {
      const {login, password} = req.body;

      if (!login || !password) {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      const admin = await admins.findOne({login: login, password: password});
      
      // const test = await admins.find()
      // console.log(test)
      if (!admin) {
        console.log(login, password)
        return res.status(401).json({ message: "Login ou senha incorretos" });
      }

      res.status(200).json({ message: "Login bem-sucedido", name: admin.name});
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao buscar admin", error: error.message });
    }
  });

interface CreateClientBody {
  adminLogin?: string;
  adminPassword?: string;
  client?: {
    login?: string;
    password?: string;
    name?: string;
    hasFilledBriefing?: boolean;
    briefing?: BriefingObject;
  };
}

router.post(
  "/api/admin/user",
  async (req: Request<{}, {}, CreateClientBody>, res: Response) => {
    try {
      const { adminLogin, adminPassword, client } = req.body;

      if (!adminLogin || !adminPassword) {
        return res.status(400).json({
          message: "Login e senha do administrador são obrigatórios"
        });
      }

      if (!client) {
        return res.status(400).json({ message: "Os dados do cliente são obrigatórios" });
      }

      const { login, password, name, briefing } = client;

      if (!login || !password || !name || !briefing) {
        return res.status(400).json({
          message: "Login, senha, nome e briefing do cliente são obrigatórios"
        });
      }

      const authenticatedAdmin = await admins.exists({
        login: adminLogin,
        password: adminPassword
      });

      if (!authenticatedAdmin) {
        return res.status(401).json({
          message: "Acesso negado. Login ou senha do administrador incorretos"
        });
      }

      const clientAlreadyExists = await clients.exists({ login });

      if (clientAlreadyExists) {
        return res.status(409).json({
          message: "Já existe um cliente com este login"
        });
      }

      const createdClient = await clients.create({
        login,
        password,
        name,
        hasFilledBriefing: client.hasFilledBriefing ?? false,
        briefing
      });

      return res.status(201).json({
        message: "Cliente criado com sucesso",
        client: {
          id: createdClient._id,
          login: createdClient.login,
          name: createdClient.name,
          hasFilledBriefing: createdClient.hasFilledBriefing,
          briefing: createdClient.briefing
        }
      });
    } catch (error: unknown) {
      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
          message: "Dados do cliente ou briefing inválidos",
          errors: error.errors
        });
      }

      console.error("Erro ao criar cliente:", error);
      return res.status(500).json({ message: "Erro interno ao criar cliente" });
    }
  }
);

export default router;
