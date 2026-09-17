import type { drive_v3 } from "@googleapis/drive";
import { getGoogleDriveClient } from "./google-drive-client.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Integração com Google Drive não configurada: ${name}`);
    return value;
}

export function createDriveClient(): drive_v3.Drive {
    return getGoogleDriveClient();
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

export async function findOrCreateFolder(
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

async function findOrCreateClientFolder(drive: drive_v3.Drive, clientLogin: string): Promise<string> {
    const rootFolderId = requiredEnvironment("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    const clientsFolderId = await findOrCreateFolder(drive, rootFolderId, "clientes");
    return findOrCreateFolder(drive, clientsFolderId, safeFolderName(clientLogin));
}

export async function createClientDriveFolder(clientLogin: string): Promise<string> {
    return findOrCreateClientFolder(createDriveClient(), clientLogin);
}

export async function setDriveFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
    const drive = createDriveClient();
    await drive.files.update({
        fileId: folderId,
        requestBody: { trashed },
        fields: "id,trashed",
        supportsAllDrives: true
    });
}
