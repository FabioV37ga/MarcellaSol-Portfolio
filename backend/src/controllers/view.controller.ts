import type { Request, Response } from "express";
import { ViewRepository } from "../repositories/view.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class ViewController {
    constructor(
        private readonly views = new ViewRepository(),
        private readonly clients = new ClientRepository()
    ) {}

    admin = async (request: Request, response: Response): Promise<Response> => {
        try {
            return response.status(200).json({ view: await this.views.findByPermission("admin") });
        } catch (error) {
            console.error("Erro ao buscar views do administrador:", error);
            return response.status(500).json({ message: "Erro ao buscar views do administrador." });
        }
    };

    adminBriefing = async (request: Request, response: Response): Promise<Response> => {
        try {
            return response.status(200).json({ views: await this.views.findAdminBriefingViews() });
        } catch (error) {
            console.error("Erro ao buscar views do briefing administrativo:", error);
            return response.status(500).json({ message: "Erro ao buscar views do briefing administrativo." });
        }
    };

    client = async (request: Request, response: Response): Promise<Response> => {
        try {
            const principal = authenticatedPrincipal(response);
            const client = await this.clients.findById(principal.subject);
            if (!client) return response.status(404).json({ message: "Cliente não encontrado." });
            return response.status(200).json({
                view: await this.views.findByPermission("client"),
                clientObject: { id: client._id, name: client.name, hasFilledBriefing: client.hasFilledBriefing },
                briefingObject: client.briefing
            });
        } catch (error) {
            console.error("Erro ao buscar views do cliente:", error);
            return response.status(500).json({ message: "Erro ao buscar views do cliente." });
        }
    };
}
