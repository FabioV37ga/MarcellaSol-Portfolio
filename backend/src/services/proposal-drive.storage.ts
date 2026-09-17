import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import { findOrCreateDriveFolder } from "./drive-folder.js";
import { getGoogleDriveClient } from "./google-drive-client.js";

export interface ProposalDriveUpload {
    folderId: string;
    attachmentUrls: string[];
}

export interface ProposalStorage {
    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[], author?: "administrator" | "client", responseIndex?: number): Promise<ProposalDriveUpload>;
    moveProposalAttachmentsToAdministratorFolder(folderId: string, attachmentUrls: string[]): Promise<number>;
    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void>;
    setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void>;
    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

type DriveClientFactory = () => drive_v3.Drive;

function safeFolderName(value: string): string {
    return value.normalize("NFKC").trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ") || "proposta-sem-titulo";
}

function proposalFolderName(title: string, proposalId: string): string {
    return `${safeFolderName(title)}-${proposalId}`;
}

export class GoogleDriveProposalStorage implements ProposalStorage {
    constructor(private readonly createClient: DriveClientFactory = getGoogleDriveClient) { }

    async uploadProposal(
        clientFolderId: string,
        proposalId: string,
        title: string,
        files: Express.Multer.File[],
        author: "administrator" | "client" = "administrator",
        responseIndex?: number
    ): Promise<ProposalDriveUpload> {
        const drive = this.createClient();
        const proposalsFolderId = await findOrCreateDriveFolder(drive, clientFolderId, "propostas");
        const folderId = await findOrCreateDriveFolder(drive, proposalsFolderId, proposalFolderName(title, proposalId));
        const authorFolderId = await findOrCreateDriveFolder(
            drive,
            folderId,
            author === "administrator" ? "administrador" : "cliente"
        );
        const uploadFolderId = author === "client" && responseIndex
            ? await findOrCreateDriveFolder(drive, authorFolderId, `resposta-${responseIndex}`)
            : authorFolderId;
        const attachmentUrls: string[] = [];
        for (const file of files) {
            const uploaded = await drive.files.create({
                requestBody: { name: file.originalname, parents: [uploadFolderId] },
                media: {
                    mimeType: file.mimetype || "application/octet-stream",
                    body: Readable.from(file.buffer)
                },
                fields: "id,webViewLink",
                supportsAllDrives: true
            });
            if (!uploaded.data.id) throw new Error(`O Google Drive não retornou o ID de ${file.originalname}`);
            attachmentUrls.push(uploaded.data.webViewLink
                || `https://drive.google.com/file/d/${encodeURIComponent(uploaded.data.id)}/view`);
        }
        return { folderId, attachmentUrls };
    }

    async moveProposalAttachmentsToAdministratorFolder(
        proposalFolderId: string,
        attachmentUrls: string[]
    ): Promise<number> {
        const fileIds = attachmentUrls.map(proposalAttachmentFileId);
        const drive = this.createClient();
        const administratorFolderId = await findOrCreateDriveFolder(drive, proposalFolderId, "administrador");
        let moved = 0;
        for (const fileId of fileIds) {
            const metadata = await drive.files.get({ fileId, fields: "id,parents", supportsAllDrives: true });
            const parents = metadata.data.parents ?? [];
            if (!parents.includes(proposalFolderId)) continue;
            await drive.files.update({
                fileId,
                addParents: administratorFolderId,
                removeParents: proposalFolderId,
                fields: "id,parents",
                supportsAllDrives: true
            });
            moved += 1;
        }
        return moved;
    }

    async renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void> {
        const drive = this.createClient();
        await drive.files.update({
            fileId: folderId,
            requestBody: { name: proposalFolderName(title, proposalId) },
            fields: "id",
            supportsAllDrives: true
        });
    }

    async setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        const drive = this.createClient();
        await drive.files.update({
            fileId: folderId,
            requestBody: { trashed },
            fields: "id,trashed",
            supportsAllDrives: true
        });
    }

    async setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void> {
        const fileId = proposalAttachmentFileId(attachmentUrl);
        const drive = this.createClient();
        await drive.files.update({
            fileId,
            requestBody: { trashed },
            fields: "id,trashed",
            supportsAllDrives: true
        });
    }
}

function proposalAttachmentFileId(attachmentUrl: string): string {
    let parsed: URL;
    try {
        parsed = new URL(attachmentUrl);
    } catch {
        throw new Error("URL do anexo do Google Drive inválida");
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com") {
        throw new Error("O anexo não pertence ao Google Drive");
    }
    const pathMatch = parsed.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
    const fileId = pathMatch?.[1] ?? parsed.searchParams.get("id");
    if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
        throw new Error("Não foi possível identificar o arquivo do anexo no Google Drive");
    }
    return fileId;
}
