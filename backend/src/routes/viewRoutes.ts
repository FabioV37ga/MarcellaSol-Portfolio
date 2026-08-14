import express, { Request, Response } from "express";
import { authenticateAdmin } from "../utils/authenticate.js";
import views from "../models/view.js";

const router = express.Router();

router.post("/api/view/admin/:view", async (req: Request, res: Response) => {
    try {
        // console.log(req.body)
        const authentication = await authenticateAdmin(req.body);


        if (authentication.ok) {

            if (req.params.view === "" || req.params.view === undefined) {
                res.status(400).json({ message: "View não especificada" });
            }else{
                const view = await views.findOne({viewName: req.params.view})

                if (view) {
                    res.status(200).json({view: view.view});
                    // console.log(view)
                } else {
                    console.log("View não encontrada.")
                    console.log(view)
                    res.status(404).json({ message: "View não encontrada" });
                }
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