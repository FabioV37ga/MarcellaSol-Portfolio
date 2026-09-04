import express from "express";
import mongoose from "mongoose";
import Projeto from "../models/projeto.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";

const router = express.Router();



// Rota de health check
router.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString(),
  });
});

// Rota de teste para buscar projetos
router.get("/api/test", requireAuthentication("admin"), async (_req, res) => {
  try {
    const projeto = await Projeto.find();
    if (!projeto) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }
    res.json(projeto);
  } catch (error: any) {
    console.error("Erro ao buscar projeto:", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Erro interno ao buscar projeto" });
  }
});

export default router;
