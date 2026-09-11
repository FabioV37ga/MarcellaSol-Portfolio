import type { DriveUpload } from "../services/googleDrive.js";
import type { AttachmentStorage } from "../services/attachment-storage.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ApplicationError } from "./errors/application-error.js";
import { BriefingFolderAccessService } from "./briefing-folder-access.service.js";
import { maskedEmail } from "../services/briefing-emails.js";
import { projectStagesAfterBriefingSubmission } from "../models/projectStage.js";
import type { Clock } from "./ports/clock.js";

export interface FileManifestEntry {
    uploadId: string;
    pageKey: string;
    answerKey: string;
    fileIndex: number;
    originalName: string;
}

interface StoredAttachment extends FileManifestEntry, DriveUpload { }

export interface SubmitBriefingCommand {
    clientId: string;
    clientLogin: string;
    briefing: Record<string, unknown>;
    manifest: FileManifestEntry[];
    files: Express.Multer.File[];
}

export class SubmitBriefingService {
    constructor(
        private readonly clients: ClientRepository,
        private readonly briefings: ClientBriefingRepository,
        private readonly attachments: AttachmentStorage,
        private readonly folderAccess: BriefingFolderAccessService,
        private readonly clock: Clock
    ) { }

    async execute(command: SubmitBriefingCommand) {
        const client = await this.clients.findById(command.clientId);
        if (!client || client.login !== command.clientLogin) throw new ApplicationError("Cliente não encontrado.", 404);

        const upload = await this.attachments.uploadBriefing(client.login, command.files);
        const storedAttachments: StoredAttachment[] = upload.files.map((file, index) => ({
            ...command.manifest[index],
            ...file
        }));
        const responses = this.addAttachmentData(command.briefing, storedAttachments) as Record<string, unknown>;
        const savedBriefing = await this.briefings.saveForClient(client._id, {
            clientLogin: client.login,
            briefingDefinition: client.toObject().briefing as unknown as Record<string, unknown>,
            responses,
            driveFolderId: upload.folderId || undefined,
            attachments: storedAttachments.map(item => ({ ...item })),
            submittedAt: this.clock.now()
        });
        await this.clients.markBriefingFilled(
            client._id,
            projectStagesAfterBriefingSubmission(client.projectStages)
        );

        const folderAccess = await this.folderAccess.execute(client.driveFolderId, responses);
        folderAccess.failures.forEach(failure => {
            console.error(
                `Falha ao conceder leitura da pasta do cliente ${client._id} para ${maskedEmail(failure.email)}:`,
                failure.message
            );
        });

        return {
            briefingId: savedBriefing._id,
            uploadedFiles: storedAttachments.length,
            folderSharing: {
                emailsFound: folderAccess.emailsFound,
                permissionsCreated: folderAccess.permissionsCreated,
                permissionsExisting: folderAccess.permissionsExisting,
                permissionsFailed: folderAccess.failures.length
            }
        };
    }

    private addAttachmentData(value: unknown, attachments: StoredAttachment[]): unknown {
        const byUploadId = new Map(attachments.map(item => [item.uploadId, item]));
        const visit = (current: unknown): unknown => {
            if (Array.isArray(current)) return current.map(visit);
            if (!current || typeof current !== "object") return current;

            const record = current as Record<string, unknown>;
            const attachment = typeof record.uploadId === "string" ? byUploadId.get(record.uploadId) : undefined;
            const next = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]));
            return attachment ? {
                ...next,
                driveFile: {
                    id: attachment.id,
                    name: attachment.name,
                    mimeType: attachment.mimeType,
                    size: attachment.size,
                    webViewLink: attachment.webViewLink
                }
            } : next;
        };
        return visit(value);
    }
}
