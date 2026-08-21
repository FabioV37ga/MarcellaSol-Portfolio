import { config } from "@/utils/connection.js";

export interface BriefingFileManifestEntry {
    uploadId: string;
    pageKey: string;
    answerKey: string;
    fileIndex: number;
    originalName: string;
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
        command.attachments.forEach(({ file }) => formData.append("files", file, file.name));
        formData.append("payload", JSON.stringify({
            briefing: command.briefing,
            fileManifest: command.attachments.map(({ manifest }) => manifest)
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
