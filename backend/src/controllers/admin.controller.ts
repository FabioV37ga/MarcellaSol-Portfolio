import type { Request, Response } from "express";
import mongoose from "mongoose";
import { CreateClientService, type CreateClientCommand } from "../application/create-client.service.js";
import { ApplicationError } from "../application/errors/application-error.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class AdminController {
    constructor(
        private readonly createClient = new CreateClientService(),
        private readonly authenticate = new AuthenticateService()
    ) {}

    login = async (request: Request, response: Response): Promise<Response> => {
        try {
            const { login, password } = request.body;
            if (!login || !password) return response.status(400).json({ message: "Login e senha são obrigatórios" });

            const { account, token } = await this.authenticate.execute("admin", login, password);
            return response.status(200).json({ message: "Login bem-sucedido", name: account.name, token });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            return response.status(500).json({ message: "Erro ao buscar admin", error: this.errorMessage(error) });
        }
    };

    session = async (_request: Request, response: Response): Promise<Response> => {
        const principal = authenticatedPrincipal(response);
        return response.status(200).json({ name: principal.name });
    };

    create = async (request: Request, response: Response): Promise<Response> => {
        try {
            const command = this.parseCreateCommand(request.body);
            const created = await this.createClient.execute(command);
            return response.status(201).json({
                message: "Cliente criado com sucesso",
                client: {
                    id: created._id,
                    login: created.login,
                    name: created.name,
                    hasFilledBriefing: created.hasFilledBriefing,
                    briefing: created.briefing
                }
            });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            if (error instanceof mongoose.Error.ValidationError) {
                return response.status(400).json({ message: "Dados do cliente ou briefing inválidos", errors: error.errors });
            }
            console.error("Erro ao criar cliente:", error);
            return response.status(500).json({ message: "Erro interno ao criar cliente" });
        }
    };

    private parseCreateCommand(body: Record<string, unknown>): CreateClientCommand {
        const client = body.client as CreateClientCommand["client"] | undefined;
        if (!client) throw new ApplicationError("Os dados do cliente são obrigatórios", 400);
        if (!client.login || !client.password || !client.name || !client.briefing) {
            throw new ApplicationError("Login, senha, nome e briefing do cliente são obrigatórios", 400);
        }
        return { client };
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
