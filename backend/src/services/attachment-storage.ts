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
import {
    renameProposalFolder,
    setProposalAttachmentTrashed,
    setProposalFolderTrashed,
    uploadProposalAttachment,
    moveProposalAttachmentsToAdministratorFolder,
    type ProposalDriveUpload
} from "./proposal-drive.storage.js";

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

export interface ProposalStorage {
    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[], author?: "administrator" | "client", responseIndex?: number): Promise<ProposalDriveUpload>;
    moveProposalAttachmentsToAdministratorFolder(folderId: string, attachmentUrls: string[]): Promise<number>;
    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void>;
    setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void>;
    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage, ClientFolderStorage, ClientRemovalStorage, BriefingReportStorage, ProposalStorage {
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

    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[], author: "administrator" | "client" = "administrator", responseIndex?: number): Promise<ProposalDriveUpload> {
        return uploadProposalAttachment(clientFolderId, proposalId, title, files, author, responseIndex);
    }

    moveProposalAttachmentsToAdministratorFolder(folderId: string, attachmentUrls: string[]): Promise<number> {
        return moveProposalAttachmentsToAdministratorFolder(folderId, attachmentUrls);
    }

    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void> {
        return renameProposalFolder(folderId, proposalId, title);
    }

    setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void> {
        return setProposalAttachmentTrashed(attachmentUrl, trashed);
    }

    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        return setProposalFolderTrashed(folderId, trashed);
    }
}
