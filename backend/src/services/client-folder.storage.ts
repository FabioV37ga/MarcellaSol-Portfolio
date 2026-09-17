import type { drive_v3 } from "@googleapis/drive";
import { findOrCreateDriveFolder, safeDriveFolderName } from "./drive-folder.js";
import { getGoogleDriveClient } from "./google-drive-client.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
}

export interface ClientRemovalStorage {
    setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

type DriveClientFactory = () => drive_v3.Drive;

function requiredRootFolderId(): string {
    const value = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
    if (!value) {
        throw new Error("Integração com Google Drive não configurada: GOOGLE_DRIVE_ROOT_FOLDER_ID");
    }
    return value;
}

export class GoogleDriveClientFolderStorage implements ClientFolderStorage, ClientRemovalStorage {
    constructor(private readonly createClient: DriveClientFactory = getGoogleDriveClient) { }

    async createClientFolder(clientLogin: string): Promise<string> {
        const drive = this.createClient();
        const clientsFolderId = await findOrCreateDriveFolder(drive, requiredRootFolderId(), "clientes");
        return findOrCreateDriveFolder(
            drive,
            clientsFolderId,
            safeDriveFolderName(clientLogin, "cliente-sem-login")
        );
    }

    async setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        const drive = this.createClient();
        await drive.files.update({
            fileId: folderId,
            requestBody: { trashed },
            fields: "id,trashed",
            supportsAllDrives: true
        });
    }
}
