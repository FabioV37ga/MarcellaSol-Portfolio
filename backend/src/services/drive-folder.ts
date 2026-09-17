import type { drive_v3 } from "@googleapis/drive";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function escapeDriveQuery(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function safeDriveFolderName(value: string, fallback: string): string {
    return value
        .normalize("NFKC")
        .trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ") || fallback;
}

export async function findOrCreateDriveFolder(
    drive: drive_v3.Drive,
    parentId: string,
    name: string
): Promise<string> {
    const folders = await drive.files.list({
        q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
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
