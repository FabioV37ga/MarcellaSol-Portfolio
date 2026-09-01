import {
    createClientDriveFolder,
    getBriefingReportDriveStatus,
    uploadBriefingFiles,
    uploadBriefingReportPdf,
    type BriefingReportDriveStatus,
    type DriveUploadResult
} from "./googleDrive.js";
import { renameProposalFolder, setProposalFolderTrashed, uploadProposalAttachment, type ProposalDriveUpload } from "./googleDrive.js";

export interface ClientFolderStorage {
    createClientFolder(clientLogin: string): Promise<string>;
}

export interface AttachmentStorage {
    uploadBriefing(clientLogin: string, files: Express.Multer.File[]): Promise<DriveUploadResult>;
}

export interface BriefingReportStorage {
    getBriefingReportStatus(clientFolderId: string): Promise<BriefingReportDriveStatus>;
    uploadBriefingReport(clientFolderId: string, clientName: string, pdf: Buffer): Promise<BriefingReportDriveStatus>;
}

export interface ProposalStorage {
    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[]): Promise<ProposalDriveUpload>;
    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void>;
    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void>;
}

export class GoogleDriveAttachmentStorage implements AttachmentStorage, ClientFolderStorage, BriefingReportStorage, ProposalStorage {
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

    uploadProposal(clientFolderId: string, proposalId: string, title: string, files: Express.Multer.File[]): Promise<ProposalDriveUpload> {
        return uploadProposalAttachment(clientFolderId, proposalId, title, files);
    }

    renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void> {
        return renameProposalFolder(folderId, proposalId, title);
    }

    setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
        return setProposalFolderTrashed(folderId, trashed);
    }
}
