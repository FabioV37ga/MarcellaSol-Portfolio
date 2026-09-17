import {
    createClientDriveFolder,
    setDriveFolderTrashed
} from "./googleDrive.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
}

export interface ClientRemovalStorage {
    setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

export class GoogleDriveAttachmentStorage implements ClientFolderStorage, ClientRemovalStorage {
    createClientFolder(clientLogin: string): Promise<string> {
        return createClientDriveFolder(clientLogin);
    }

    setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        return setDriveFolderTrashed(folderId, trashed);
    }

}
