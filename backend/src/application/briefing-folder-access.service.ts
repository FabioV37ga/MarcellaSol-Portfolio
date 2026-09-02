import { extractResidentEmails } from "../services/briefing-emails.js";
import {
    GoogleDriveAttachmentStorage,
    type FolderReadAccessStorage
} from "../services/attachment-storage.js";

export interface BriefingFolderAccessFailure {
    email: string;
    message: string;
}

export interface BriefingFolderAccessResult {
    emailsFound: number;
    permissionsCreated: number;
    permissionsExisting: number;
    failures: BriefingFolderAccessFailure[];
}

export class BriefingFolderAccessService {
    constructor(
        private readonly folders: FolderReadAccessStorage = new GoogleDriveAttachmentStorage()
    ) {}

    async execute(folderId: string | undefined, briefing: unknown): Promise<BriefingFolderAccessResult> {
        const emails = extractResidentEmails(briefing);
        const result: BriefingFolderAccessResult = {
            emailsFound: emails.length,
            permissionsCreated: 0,
            permissionsExisting: 0,
            failures: []
        };

        if (!folderId) {
            result.failures = emails.map(email => ({
                email,
                message: "Cliente sem pasta raiz configurada no Google Drive"
            }));
            return result;
        }

        // O Drive não suporta operações concorrentes de permissão no mesmo arquivo/pasta.
        for (const email of emails) {
            try {
                const permission = await this.folders.grantFolderReadAccess(folderId, email);
                if (permission.created) result.permissionsCreated += 1;
                else result.permissionsExisting += 1;
            } catch (error: unknown) {
                result.failures.push({
                    email,
                    message: error instanceof Error ? error.message : "Erro desconhecido ao compartilhar pasta"
                });
            }
        }

        return result;
    }
}
