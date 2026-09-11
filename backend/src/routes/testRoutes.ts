import express from "express";
import Projeto from "../models/projeto.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";

export default function createTestRoutes(requireAuthentication: AuthenticationGuard) {
  const router = express.Router();

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

  return router;
}
