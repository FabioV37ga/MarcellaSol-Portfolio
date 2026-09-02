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
import { ClientProposalService } from "../application/client-proposal.service.js";
import { SessionService } from "../services/session.service.js";
import { loginCredentials } from "./login-credentials.js";

export class ClientController {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly submitBriefing = new SubmitBriefingService(),
        private readonly authenticate = new AuthenticateService(),
        private readonly proposals = new ClientProposalService(),
        private readonly sessions = new SessionService()
    ) {}

    login = async (request: Request, response: Response): Promise<Response> => {
        try {
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
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao autenticar cliente:", error);
            return response.status(500).json({ message: "Erro interno ao autenticar cliente" });
        }
    };

    logout = async (_request: Request, response: Response): Promise<Response> => {
        try {
            await this.sessions.revoke(authenticatedPrincipal(response));
            return response.status(204).send();
        } catch (error: unknown) {
            console.error("Erro ao revogar sessão de cliente:", error);
            return response.status(500).json({ message: "Erro interno ao encerrar sessão" });
        }
    };

    approvals = async (_request: Request, response: Response): Promise<Response> => {
        try {
            const principal = authenticatedPrincipal(response);
            const proposals = await this.proposals.list(principal.subject);
            return response.status(200).json({
                proposals: proposals.map(proposal => ({
                    _id: proposal._id,
                    title: proposal.title,
                    description: proposal.description,
                    attachments: proposal.attachments?.length
                        ? proposal.attachments
                        : proposal.attachment ? [proposal.attachment] : [],
                    userComment: proposal.userComment,
                    status: proposal.status,
                    createdAt: proposal.createdAt,
                    updatedAt: proposal.updatedAt
                }))
            });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao carregar aprovações do cliente:", error);
            return response.status(500).json({ message: "Erro ao carregar aprovações." });
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
            return response.status(500).json({ message: "Erro interno ao salvar briefing" });
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
        if (new Set(manifest.map(item => item.uploadId)).size !== manifest.length) {
            throw new ApplicationError("Os identificadores dos anexos devem ser únicos", 400);
        }
        if (manifest.some((item, index) => item.originalName !== files[index]?.originalname)) {
            throw new ApplicationError("A ordem dos anexos não corresponde aos arquivos enviados", 400);
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
            && typeof item.answerKey === "string" && Number.isInteger(item.fileIndex) && item.fileIndex >= 0
            && typeof item.originalName === "string";
    }
}
