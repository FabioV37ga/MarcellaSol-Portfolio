import type { Request, Response } from "express";
import { ApplicationError } from "../application/errors/application-error.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";
import type { ClientRepository } from "../repositories/client.repository.js";
import type { ViewRepository } from "../repositories/view.repository.js";

export class ClientViewsController {
    constructor(
        private readonly views: Pick<ViewRepository, "findByPermission">,
        private readonly clients: Pick<ClientRepository, "findById">
    ) { }

    view = async (_request: Request, response: Response): Promise<Response> => {
        const client = await this.clients.findById(authenticatedPrincipal(response).subject);
        if (!client) throw new ApplicationError("Cliente não encontrado.", 404);
        return response.status(200).json({
            view: await this.views.findByPermission("client"),
            clientObject: { id: client._id, name: client.name, hasFilledBriefing: client.hasFilledBriefing },
            briefingObject: client.briefing
        });
    };
}
