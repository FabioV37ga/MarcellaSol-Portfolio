import express, { Request, Response } from "express";
import { authenticateAdmin, authenticateClient } from "../utils/authenticate.js";
import views from "../models/view.js";

const router = express.Router();

router.post("/api/view/admin", async (req: Request, res: Response) => {
    try {
        // console.log(req.body)
        const authentication = await authenticateAdmin(req.body);


        if (authentication.ok) {


            const view = await views.find({ permission: "admin" })

            if (view) {
                res.status(200).json({ view: view });
                // console.log(view)
            } else {
                console.log("View não encontrada.")
                console.log(view)
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

router.post("/api/view/client", async (req: Request, res: Response) => {
    try {
        const authentication = await authenticateClient(req.body);

        if (!authentication.ok) {
            res.status(401).json({ message: "Acesso negado. Login ou senha incorretos." });
            return;
        }

        const view = await views.find({ permission: "client" });
        res.status(200).json({ view });
    } catch (error) {
        console.error("Erro ao buscar views do cliente:", error);
        res.status(500).json({ message: "Erro ao buscar views do cliente." });
    }
});

export default router;
