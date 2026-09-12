import { config } from "@/utils/connection.js";

export interface BriefingFileManifestEntry {
    uploadId: string;
    pageKey: string;
    answerKey: string;
    fileIndex: number;
    originalName: string;
    transportName?: string;
}

export interface BriefingAttachment {
    file: File;
    manifest: BriefingFileManifestEntry;
}

export interface SubmitBriefingCommand {
    token: string;
    briefing: unknown;
    attachments: BriefingAttachment[];
}

export class BriefingApi {
    async submit(command: SubmitBriefingCommand): Promise<void> {
        const formData = new FormData();
        const attachments = command.attachments.map((attachment, index) => ({
            ...attachment,
            manifest: {
                ...attachment.manifest,
                transportName: transportFileName(index, attachment.file.name)
            }
        }));
        attachments.forEach(({ file, manifest }) => formData.append("files", file, manifest.transportName));
        formData.append("payload", JSON.stringify({
            briefing: command.briefing,
            fileManifest: attachments.map(({ manifest }) => manifest)
        }));

        const response = await fetch(`${config.apiBaseUrl}/client/briefing`, {
            method: "POST",
            headers: { Authorization: `Bearer ${command.token}` },
            body: formData
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(result.message || "Não foi possível enviar o briefing.");
        }
    }
}

function transportFileName(index: number, originalName: string): string {
    const extension = originalName.match(/\.[A-Za-z0-9]{1,10}$/)?.[0].toLowerCase() ?? "";
    return `briefing-attachment-${index}${extension}`;
}
