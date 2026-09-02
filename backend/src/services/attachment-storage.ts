import {
    createClientDriveFolder,
    getBriefingReportDriveStatus,
    uploadBriefingFiles,
    uploadBriefingReportPdf,
    downloadDriveImage,
    type BriefingReportDriveStatus,
    type DriveUploadResult,
    type DriveImageDownload
} from "./googleDrive.js";
import {
    grantFolderReadAccess,
    renameProposalFolder,
    setProposalFolderTrashed,
    uploadProposalAttachment,
    type FolderReadAccessResult,
    type ProposalDriveUpload
} from "./googleDrive.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
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
    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[]): Promise<ProposalDriveUpload>;
    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void>;
    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

export interface FolderReadAccessStorage {
    grantFolderReadAccess(folderId: string, email: string): Promise<FolderReadAccessResult>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage, ClientFolderStorage, BriefingReportStorage, ProposalStorage, FolderReadAccessStorage {
    createClientFolder(clientLogin: string): Promise<string> {
        return createClientDriveFolder(clientLogin);
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

    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[]): Promise<ProposalDriveUpload> {
        return uploadProposalAttachment(clientFolderId, proposalId, title, files);
    }

    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void> {
        return renameProposalFolder(folderId, proposalId, title);
    }

    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        return setProposalFolderTrashed(folderId, trashed);
    }

    grantFolderReadAccess(folderId: string, email: string): Promise<FolderReadAccessResult> {
        return grantFolderReadAccess(folderId, email);
    }
}
