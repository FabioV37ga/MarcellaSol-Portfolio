import {
    createClientDriveFolder,
    getBriefingReportDriveStatus,
    uploadBriefingFiles,
    uploadBriefingReportPdf,
    downloadDriveImage,
    setDriveFolderTrashed,
    type BriefingReportDriveStatus,
    type DriveUploadResult,
    type DriveImageDownload
} from "./googleDrive.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
}

export interface ClientRemovalStorage {
    setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

export interface AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult>;
}

export interface BriefingReportStorage {
    getBriefingReportStatus(clientFolderId: string): Promise<BriefingReportDriveStatus>;
    uploadBriefingReport(clientFolderId: string, clientName: string, pdf: Buffer): Promise<BriefingReportDriveStatus>;
    downloadReportImage(fileId: string): Promise<DriveImageDownload>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage, ClientFolderStorage, ClientRemovalStorage, BriefingReportStorage {
    createClientFolder(clientLogin: string): Promise<string> {
        return createClientDriveFolder(clientLogin);
    }

    setClientFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        return setDriveFolderTrashed(folderId, trashed);
    }

    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult> {
        return uploadBriefingFiles(clientLogin, files);
    }

    getBriefingReportStatus(clientFolderId: string): Promise<BriefingReportDriveStatus> {
        return getBriefingReportDriveStatus(clientFolderId);
    }

    uploadBriefingReport(clientFolderId: string, clientName: string, pdf: Buffer): Promise<BriefingReportDriveStatus> {
        return uploadBriefingReportPdf(clientFolderId, clientName, pdf);
    }

    downloadReportImage(fileId: string): Promise<DriveImageDownload> {
        return downloadDriveImage(fileId);
    }

}
