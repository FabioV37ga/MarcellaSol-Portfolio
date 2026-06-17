import express, {Request, Response } from "express";
import mongoose from "mongoose";
import Projeto from "../models/projeto.js";

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
router.get("/api/test", async (req, res) => {
  try {
    const projeto = await Projeto.find();
    if (!projeto) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }
    res.json(projeto);
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar projeto", error: error.message });
  }
});

export default router;