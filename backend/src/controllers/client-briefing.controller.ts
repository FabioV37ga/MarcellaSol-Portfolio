import type { Request, Response } from "express";
import { ApplicationError } from "../application/errors/application-error.js";
import type {
    SubmitBriefingService,
    FileManifestEntry,
    SubmitBriefingCommand
} from "../application/submit-briefing.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class ClientBriefingController {
    constructor(private readonly submitBriefing: Pick<SubmitBriefingService, "execute">) { }

    submit = async (request: Request, response: Response): Promise<Response> => {
        const result = await this.submitBriefing.execute(this.parseSubmitCommand(request, response));
        return response.status(200).json({ message: "Briefing enviado com sucesso", ...result });
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
        if (manifest.some((item, index) => (item.transportName ?? item.originalName) !== files[index]?.originalname)) {
            throw new ApplicationError("A ordem dos anexos não corresponde aos arquivos enviados", 400);
        }
        files.forEach((file, index) => { file.originalname = manifest[index].originalName; });
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
            && typeof item.originalName === "string"
            && (item.transportName === undefined || typeof item.transportName === "string");
    }
}
