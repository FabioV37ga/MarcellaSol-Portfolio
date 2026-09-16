import type { Request, Response } from "express";
import type { AuthenticateService } from "../application/authenticate.service.js";
import { ApplicationError } from "../application/errors/application-error.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";
import type { ClientRepository } from "../repositories/client.repository.js";
import type { SessionService } from "../services/session.service.js";
import { loginCredentials } from "./login-credentials.js";

export class ClientSessionsController {
    constructor(
        private readonly clients: Pick<ClientRepository, "findById">,
        private readonly authenticate: Pick<AuthenticateService, "execute">,
        private readonly sessions: Pick<SessionService, "revoke">
    ) { }

    login = async (request: Request, response: Response): Promise<Response> => {
        const { login, password } = loginCredentials(request.body);
        const { account: client, token } = await this.authenticate.execute("client", login, password);
        return response.status(200).json({
            message: "Login bem-sucedido",
            name: client.name,
            hasFilledBriefing: client.hasFilledBriefing,
            token,
            briefingObject: client.briefing,
            clientObject: { id: client._id, name: client.name, hasFilledBriefing: client.hasFilledBriefing }
        });
    };

    logout = async (_request: Request, response: Response): Promise<Response> => {
        await this.sessions.revoke(authenticatedPrincipal(response));
        return response.status(204).send();
    };

    session = async (_request: Request, response: Response): Promise<Response> => {
        const client = await this.clients.findById(authenticatedPrincipal(response).subject);
        if (!client) throw new ApplicationError("Cliente não encontrado.", 404);
        return response.status(200).json({ name: client.name, hasFilledBriefing: client.hasFilledBriefing });
    };
}
