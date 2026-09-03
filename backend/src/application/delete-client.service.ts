import mongoose from "mongoose";
import { ClientRepository } from "../repositories/client.repository.js";
import { ClientDeletionRepository } from "../repositories/client-deletion.repository.js";
import {
    GoogleDriveAttachmentStorage,
    type ClientRemovalStorage
} from "../services/attachment-storage.js";
import { ApplicationError } from "./errors/application-error.js";

export class DeleteClientService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly deletion = new ClientDeletionRepository(),
        private readonly storage: ClientRemovalStorage = new GoogleDriveAttachmentStorage()
    ) {}

    async execute(clientId: string, confirmationName: unknown): Promise<void> {
        if (!mongoose.isValidObjectId(clientId)) throw new ApplicationError("Cliente não encontrado", 404);

        const client = await this.clients.findByIdForAdmin(clientId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);
        if (typeof confirmationName !== "string" || confirmationName !== client.name) {
            throw new ApplicationError("O nome informado não corresponde exatamente ao nome do cliente", 400);
        }

        const folderId = client.driveFolderId?.trim();
        let folderTrashed = false;
        try {
            if (folderId) {
                await this.storage.setClientFolderTrashed(folderId, true);
                folderTrashed = true;
            }

            const deleted = await this.deletion.deleteByIdAndName(clientId, client.name);
            if (!deleted) throw new ApplicationError("Os dados do cliente foram alterados. Recarregue a página", 409);
        } catch (error) {
            if (folderId && folderTrashed) {
                await this.storage.setClientFolderTrashed(folderId, false).catch(restoreError => {
                    console.error("Não foi possível restaurar a pasta do cliente após falha na exclusão:", restoreError);
                });
            }
            throw error;
        }
    }
}
