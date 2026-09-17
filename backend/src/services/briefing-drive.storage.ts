import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import { getGoogleDriveClient } from "./google-drive-client.js";
import { findOrCreateFolder } from "./googleDrive.js";

export interface DriveUpload {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    webViewLink?: string;
}

export interface DriveUploadResult {
    folderId: string;
    files: DriveUpload[];
}

export interface AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult>;
}

type DriveClientFactory = () => drive_v3.Drive;

function requiredRootFolderId(): string {
    const value = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
    if (!value) {
        throw new Error("Integração com Google Drive não configurada: GOOGLE_DRIVE_ROOT_FOLDER_ID");
    }
    return value;
}

function safeClientFolderName(value: string): string {
    return value
        .normalize("NFKC")
        .trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ") || "cliente-sem-login";
}

export class GoogleDriveBriefingStorage implements AttachmentStorage {
    constructor(private readonly createClient: DriveClientFactory = getGoogleDriveClient) { }

    async uploadBriefing(
        clientLogin: string,
        files: Express.Multer.File[]
    ): Promise<DriveUploadResult> {
        if (files.length === 0) return { folderId: "", files: [] };

        const drive = this.createClient();
        const clientsFolderId = await findOrCreateFolder(drive, requiredRootFolderId(), "clientes");
        const clientFolderId = await findOrCreateFolder(drive, clientsFolderId, safeClientFolderName(clientLogin));
        const briefingFolderId = await findOrCreateFolder(drive, clientFolderId, "documentos_briefing");
        const uploadedFiles: DriveUpload[] = [];

        for (const file of files) {
            const uploaded = await drive.files.create({
                requestBody: {
                    name: file.originalname,
                    parents: [briefingFolderId]
                },
                media: {
                    mimeType: file.mimetype || "application/octet-stream",
                    body: Readable.from(file.buffer)
                },
                fields: "id,name,mimeType,size,webViewLink",
                supportsAllDrives: true
            });

            if (!uploaded.data.id) {
                throw new Error(`O Google Drive não retornou o ID de ${file.originalname}`);
            }
            uploadedFiles.push({
                id: uploaded.data.id,
                name: uploaded.data.name || file.originalname,
                mimeType: uploaded.data.mimeType || file.mimetype,
                size: Number(uploaded.data.size) || file.size,
                webViewLink: uploaded.data.webViewLink || undefined
            });
        }

        return { folderId: briefingFolderId, files: uploadedFiles };
    }
}
