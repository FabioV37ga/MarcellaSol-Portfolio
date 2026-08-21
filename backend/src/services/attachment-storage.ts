import { uploadBriefingFiles, type DriveUploadResult } from "./googleDrive.js";

export interface AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult> {
        return uploadBriefingFiles(clientLogin, files);
    }
}
