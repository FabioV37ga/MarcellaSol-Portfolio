import type { Request, Response } from "express";
import type { AuthenticateService } from "../application/authenticate.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";
import type { SessionService } from "../services/session.service.js";
import { loginCredentials } from "./login-credentials.js";

export class AdminSessionsController {
    constructor(
        private readonly authenticate: Pick<AuthenticateService, "execute">,
        private readonly sessions: Pick<SessionService, "revoke">
    ) { }

    login = async (request: Request, response: Response): Promise<Response> => {
        const { login, password } = loginCredentials(request.body);
        const { account, token } = await this.authenticate.execute("admin", login, password);
        return response.status(200).json({ message: "Login bem-sucedido", name: account.name, token });
    };

    logout = async (_request: Request, response: Response): Promise<Response> => {
        await this.sessions.revoke(authenticatedPrincipal(response));
        return response.status(204).send();
    };

    session = async (_request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ name: authenticatedPrincipal(response).name });
    };
}
