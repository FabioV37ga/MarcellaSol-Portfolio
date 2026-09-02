import mongoose from "mongoose";
import { ApplicationError } from "./errors/application-error.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ClientProposalRepository } from "../repositories/client-proposal.repository.js";
import { GoogleDriveAttachmentStorage, type ProposalStorage } from "../services/attachment-storage.js";

interface ProposalInput { title?: unknown; description?: unknown; }
const MAX_CLIENT_COMMENT_LENGTH = 2000;

export class ClientProposalService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly proposals = new ClientProposalRepository(),
        private readonly storage: ProposalStorage = new GoogleDriveAttachmentStorage()
    ) {}

    async list(userId: string) {
        await this.requireClient(userId, false);
        return this.proposals.findByUserId(userId);
    }

    async create(userId: string, input: ProposalInput, files: Express.Multer.File[] = []) {
        const client = await this.requireClient(userId);
        const title = this.requiredText(input.title, "Título");
        const description = this.requiredText(input.description, "Descrição");
        if (files.length === 0) throw new ApplicationError("Ao menos um anexo da proposta é obrigatório", 400);

        const proposalId = new mongoose.Types.ObjectId();
        const upload = await this.storage.uploadProposal(
            client.driveFolderId!, proposalId.toString(), title, files
        );
        return this.proposals.create({
            _id: proposalId,
            userId: client._id,
            title,
            description,
            attachments: upload.attachmentUrls,
            attachmentFolderId: upload.folderId,
            userComment: "",
            status: "sent"
        });
    }

    async edit(userId: string, proposalId: string, input: ProposalInput, files: Express.Multer.File[] = []) {
        this.requireObjectId(proposalId, "Proposta não encontrada");
        const client = await this.requireClient(userId);
        const proposal = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!proposal) throw new ApplicationError("Proposta não encontrada", 404);

        const title = this.requiredText(input.title, "Título");
        const description = this.requiredText(input.description, "Descrição");
        const update: Record<string, unknown> = { title, description };
        if (files.length > 0) {
            const upload = await this.storage.uploadProposal(client.driveFolderId!, proposalId, title, files);
            const currentAttachments = proposal.attachments?.length
                ? proposal.attachments
                : proposal.attachment ? [proposal.attachment] : [];
            update.attachments = [...currentAttachments, ...upload.attachmentUrls];
            update.attachmentFolderId = upload.folderId;
        } else if (proposal.attachmentFolderId && proposal.title !== title) {
            await this.storage.renameProposalFolder(proposal.attachmentFolderId, proposalId, title);
        }
        return this.proposals.update(proposalId, userId, update);
    }

    async resend(userId: string, proposalId: string) {
        this.requireObjectId(proposalId, "Proposta não encontrada");
        const proposal = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!proposal) throw new ApplicationError("Proposta não encontrada", 404);
        if (proposal.status !== "beated") {
            throw new ApplicationError("Somente propostas rebatidas podem ser reenviadas", 409);
        }
        return this.proposals.update(proposalId, userId, { status: "resent" });
    }

    async approve(userId: string, proposalId: string) {
        return this.decide(userId, proposalId, "approved", "");
    }

    async beat(userId: string, proposalId: string, comment: unknown) {
        const userComment = this.requiredText(comment, "Comentário");
        if (userComment.length > MAX_CLIENT_COMMENT_LENGTH) {
            throw new ApplicationError(`O comentário deve ter no máximo ${MAX_CLIENT_COMMENT_LENGTH} caracteres`, 400);
        }
        return this.decide(userId, proposalId, "beated", userComment);
    }

    async remove(userId: string, proposalId: string): Promise<void> {
        this.requireObjectId(proposalId, "Proposta não encontrada");
        await this.requireClient(userId);
        const proposal = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!proposal) throw new ApplicationError("Proposta não encontrada", 404);

        if (proposal.attachmentFolderId) {
            await this.storage.setProposalFolderTrashed(proposal.attachmentFolderId, true);
        }

        try {
            const removed = await this.proposals.delete(proposalId, userId);
            if (!removed) throw new ApplicationError("Proposta não encontrada", 404);
        } catch (error) {
            if (proposal.attachmentFolderId) {
                await this.storage.setProposalFolderTrashed(proposal.attachmentFolderId, false)
                    .catch(restoreError => console.error("Não foi possível restaurar a pasta da proposta:", restoreError));
            }
            throw error;
        }
    }

    private async requireClient(userId: string, requireDriveFolder = true) {
        this.requireObjectId(userId, "Cliente não encontrado");
        const client = await this.clients.findById(userId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);
        if (requireDriveFolder && !client.driveFolderId) {
            throw new ApplicationError("O cliente não possui pasta configurada no Drive", 409);
        }
        return client;
    }

    private async decide(
        userId: string,
        proposalId: string,
        status: "approved" | "beated",
        userComment: string
    ) {
        this.requireObjectId(userId, "Cliente não encontrado");
        this.requireObjectId(proposalId, "Proposta não encontrada");
        const proposal = await this.proposals.decide(proposalId, userId, status, userComment);
        if (proposal) return proposal;

        const existing = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!existing) throw new ApplicationError("Proposta não encontrada", 404);
        throw new ApplicationError("Esta proposta não está mais disponível para aprovação", 409);
    }

    private requireObjectId(value: string, message: string): void {
        if (!mongoose.isValidObjectId(value)) throw new ApplicationError(message, 404);
    }

    private requiredText(value: unknown, field: string): string {
        if (typeof value !== "string" || !value.trim()) throw new ApplicationError(`${field} é obrigatório`, 400);
        return value.trim();
    }
}
