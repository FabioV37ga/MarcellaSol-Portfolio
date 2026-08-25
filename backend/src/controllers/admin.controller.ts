import type { Request, Response } from "express";
import mongoose from "mongoose";
import { CreateClientService, type CreateClientCommand } from "../application/create-client.service.js";
import { ApplicationError } from "../application/errors/application-error.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { ListClientsService } from "../application/list-clients.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class AdminController {
    constructor(
        private readonly createClient = new CreateClientService(),
        private readonly authenticate = new AuthenticateService(),
        private readonly listClients = new ListClientsService()
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

    clients = async (_request: Request, response: Response): Promise<Response> => {
        try {
            return response.status(200).json({ clients: await this.listClients.execute() });
        } catch (error: unknown) {
            console.error("Erro ao listar clientes:", error);
            return response.status(500).json({ message: "Erro interno ao listar clientes" });
        }
    };

    client = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
            return response.status(200).json({ client: await this.listClients.executeOne(id) });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao buscar cliente:", error);
            return response.status(500).json({ message: "Erro interno ao buscar cliente" });
        }
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
