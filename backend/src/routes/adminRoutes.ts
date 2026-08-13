import express, {Request, Response } from "express";
import mongoose from "mongoose";
import admins from "../models/admin.js";

const router = express.Router();



// Rota de health check
router.post("/admin/login", async (req, res) => {

    
    try {
      const {login, password} = req.body;

      if (!login || !password) {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      const admin = await admins.findOne({login: login, password: password});

      if (!admin) {
        return res.status(404).json({ message: "Admin não encontrado" });
      }

      res.status(200).json({ message: "Login bem-sucedido"});
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao buscar admin", error: error.message });
    }
  });

export default router;