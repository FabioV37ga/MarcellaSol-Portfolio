import type { Request, Response } from "express";
import { ApplicationError } from "../application/errors/application-error.js";
import {
    SubmitBriefingService,
    type FileManifestEntry,
    type SubmitBriefingCommand
} from "../application/submit-briefing.service.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class ClientController {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly submitBriefing = new SubmitBriefingService(),
        private readonly authenticate = new AuthenticateService()
    ) {}

    login = async (request: Request, response: Response): Promise<Response> => {
        try {
            const { login, password } = request.body;
            if (!login || !password) return response.status(400).json({ message: "Login e senha são obrigatórios" });

            const { account: client, token } = await this.authenticate.execute("client", login, password);
            return response.status(200).json({
                message: "Login bem-sucedido",
                name: client.name,
                hasFilledBriefing: client.hasFilledBriefing,
                token,
                briefingObject: client.briefing,
                clientObject: { id: client._id, name: client.name, hasFilledBriefing: client.hasFilledBriefing }
            });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            return response.status(500).json({
                message: "Erro ao buscar cliente",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };

    session = async (_request: Request, response: Response): Promise<Response> => {
        const principal = authenticatedPrincipal(response);
        const client = await this.clients.findById(principal.subject);
        if (!client) return response.status(404).json({ message: "Cliente não encontrado." });
        return response.status(200).json({ name: client.name, hasFilledBriefing: client.hasFilledBriefing });
    };

    submit = async (request: Request, response: Response): Promise<Response> => {
        try {
            const command = this.parseSubmitCommand(request, response);
            const result = await this.submitBriefing.execute(command);
            return response.status(200).json({ message: "Briefing enviado com sucesso", ...result });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao salvar briefing do cliente:", error);
            const message = error instanceof Error && error.message.startsWith("Integração com Google Drive não configurada")
                ? error.message : "Erro ao salvar briefing";
            return response.status(500).json({ message });
        }
    };

    private parseSubmitCommand(request: Request, response: Response): SubmitBriefingCommand {
        const body = this.parseMultipartPayload(request.body);
        const { briefing, fileManifest } = body;
        const principal = authenticatedPrincipal(response);
        if (!briefing || typeof briefing !== "object" || Array.isArray(briefing)) {
            throw new ApplicationError("Briefing inválido", 400);
        }

        const files = (request.files ?? []) as Express.Multer.File[];
        const manifest = Array.isArray(fileManifest) ? fileManifest as FileManifestEntry[] : [];
        if (files.length !== manifest.length) {
            throw new ApplicationError("A lista de anexos não corresponde aos arquivos enviados", 400);
        }
        if (manifest.some(item => !this.isManifestEntry(item))) {
            throw new ApplicationError("Metadados dos anexos inválidos", 400);
        }
        return {
            clientId: principal.subject,
            clientLogin: principal.login,
            briefing: briefing as Record<string, unknown>,
            manifest,
            files
        };
    }

    private parseMultipartPayload(body: Record<string, unknown>): Record<string, unknown> {
        if (typeof body?.payload !== "string") return body ?? {};
        try {
            const payload: unknown = JSON.parse(body.payload);
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
            return payload as Record<string, unknown>;
        } catch {
            throw new ApplicationError("Payload multipart inválido", 400);
        }
    }

    private isManifestEntry(item: FileManifestEntry): boolean {
        return Boolean(item) && typeof item.uploadId === "string" && typeof item.pageKey === "string"
            && typeof item.answerKey === "string" && typeof item.fileIndex === "number"
            && typeof item.originalName === "string";
    }
}
