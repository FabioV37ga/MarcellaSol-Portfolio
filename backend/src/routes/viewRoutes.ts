import express, { Request, Response } from "express";
import { authenticateAdmin } from "../utils/authenticate.js";

const router = express.Router();

router.get("/api/view/admin/:view", async (req: Request, res: Response) => {
    try {
        const authentication = await authenticateAdmin(req.body);

        if (authentication.ok) {

            if (req.params.view === "home") {
                res.status(200).json({ message: "Acesso à view home concedido" });
            } else {
                res.status(404).json({ message: "View não encontrada" });
            }

        } else {
            res.status(404).json({ message: "Acesso negado. Login ou senha incorretos." });
        }

    } catch (error) {
        console.error("Erro ao buscar admin:", error);
        res.status(401).json({ message: "Acesso negado. Login ou senha incorretos." });
    }
})

export default router;