import { createClientDriveFolder, uploadBriefingFiles, type DriveUploadResult } from "./googleDrive.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
}

export interface AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage, ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string> {
        return createClientDriveFolder(clientLogin);
    }

    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult> {
        return uploadBriefingFiles(clientLogin, files);
    }
}
