import { Readable } from "node:stream";
import { drive, type drive_v3 } from "@googleapis/drive";
import { OAuth2Client } from "google-auth-library";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

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

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Integração com Google Drive não configurada: ${name}`);
    return value;
}

function createDriveClient(): drive_v3.Drive {
    const auth = new OAuth2Client(
        requiredEnvironment("GOOGLE_OAUTH_CLIENT_ID"),
        requiredEnvironment("GOOGLE_OAUTH_CLIENT_SECRET"),
        process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
    );

    auth.setCredentials({
        refresh_token: requiredEnvironment("GOOGLE_OAUTH_REFRESH_TOKEN")
    });

    return drive({ version: "v3", auth });
}

function escapeDriveQuery(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeFolderName(value: string): string {
    const safeValue = value
        .normalize("NFKC")
        .trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ");

    return safeValue || "cliente-sem-login";
}

async function findOrCreateFolder(
    drive: drive_v3.Drive,
    parentId: string,
    name: string
): Promise<string> {
    const escapedName = escapeDriveQuery(name);
    const folders = await drive.files.list({
        q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapedName}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
        fields: "files(id,name)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1
    });

    const existingId = folders.data.files?.[0]?.id;
    if (existingId) return existingId;

    const created = await drive.files.create({
        requestBody: {
            name,
            mimeType: FOLDER_MIME_TYPE,
            parents: [parentId]
        },
        fields: "id",
        supportsAllDrives: true
    });

    if (!created.data.id) throw new Error(`O Google Drive não retornou o ID da pasta ${name}`);
    return created.data.id;
}

export async function uploadBriefingFiles(
    clientLogin: string,
    files: Express.Multer.File[]
): Promise<DriveUploadResult> {
    if (files.length === 0) return { folderId: "", files: [] };

    const drive = createDriveClient();
    const rootFolderId = requiredEnvironment("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    const clientsFolderId = await findOrCreateFolder(drive, rootFolderId, "clientes");
    const clientFolderId = await findOrCreateFolder(drive, clientsFolderId, safeFolderName(clientLogin));
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

        if (!uploaded.data.id) throw new Error(`O Google Drive não retornou o ID de ${file.originalname}`);
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
