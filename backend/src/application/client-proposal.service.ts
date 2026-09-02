import mongoose from "mongoose";
import { ApplicationError } from "./errors/application-error.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ClientProposalRepository } from "../repositories/client-proposal.repository.js";
import { GoogleDriveAttachmentStorage, type ProposalStorage } from "../services/attachment-storage.js";
import {
    normalizedProjectStages,
    projectStageKeys,
    projectStagesForProposal,
    type ProjectStage,
    type ProjectStageKey,
    type ProjectStageStatus
} from "../models/projectStage.js";
import type { ProposalStatus } from "../models/clientProposal.js";

interface ProposalInput { title?: unknown; description?: unknown; stageKey?: unknown; }
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
        const stageKey = this.requiredStageKey(input.stageKey);
        if (files.length === 0) throw new ApplicationError("Ao menos um anexo da proposta é obrigatório", 400);

        const proposalId = new mongoose.Types.ObjectId();
        const upload = await this.storage.uploadProposal(
            client.driveFolderId!, proposalId.toString(), title, files
        );
        try {
            const proposal = await this.proposals.create({
                _id: proposalId,
                userId: client._id,
                title,
                description,
                attachments: upload.attachmentUrls,
                attachmentFolderId: upload.folderId,
                userComment: "",
                status: "sent",
                stageKey
            });
            const projectState = await this.synchronizeProjectStage(userId, client, stageKey, "awaiting-approval");
            return { proposal, ...projectState };
        } catch (error) {
            await this.proposals.delete(proposalId.toString(), userId)
                .catch(rollbackError => console.error("Não foi possível desfazer a criação da proposta:", rollbackError));
            await this.storage.setProposalFolderTrashed(upload.folderId, true)
                .catch(rollbackError => console.error("Não foi possível remover os anexos da proposta não criada:", rollbackError));
            throw error;
        }
    }

    async edit(userId: string, proposalId: string, input: ProposalInput, files: Express.Multer.File[] = []) {
        this.requireObjectId(proposalId, "Proposta não encontrada");
        const client = await this.requireClient(userId);
        const proposal = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!proposal) throw new ApplicationError("Proposta não encontrada", 404);

        const title = this.requiredText(input.title, "Título");
        const description = this.requiredText(input.description, "Descrição");
        const stageKey = this.requiredStageKey(input.stageKey);
        const update: Record<string, unknown> = { title, description, stageKey };
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
            throw new ApplicationError("Somente propostas com alterações solicitadas podem ser reenviadas", 409);
        }
        const client = await this.requireClient(userId, false);
        const updated = await this.proposals.update(proposalId, userId, { status: "resent" });
        if (!updated) throw new ApplicationError("Proposta não encontrada", 404);

        try {
            const projectState = proposal.stageKey
                ? await this.synchronizeProjectStage(userId, client, proposal.stageKey, "awaiting-approval")
                : this.currentProjectState(client);
            return { proposal: updated, ...projectState };
        } catch (error) {
            await this.restoreProposalStatus(
                proposalId,
                userId,
                "resent",
                "beated",
                proposal.userComment ?? ""
            );
            throw error;
        }
    }

    async approve(userId: string, proposalId: string, comment: unknown) {
        return this.decide(userId, proposalId, "approved", this.requiredProposalComment(comment));
    }

    async beat(userId: string, proposalId: string, comment: unknown, confirmRevisionRound: unknown) {
        if (confirmRevisionRound !== true) {
            throw new ApplicationError("Confirme o uso de 1 rodada de alterações", 400);
        }
        return this.decide(userId, proposalId, "beated", this.requiredProposalComment(comment));
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

    async removeAttachment(userId: string, proposalId: string, attachmentIndex: unknown) {
        this.requireObjectId(proposalId, "Proposta não encontrada");
        await this.requireClient(userId, false);
        const proposal = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!proposal) throw new ApplicationError("Proposta não encontrada", 404);

        const index = typeof attachmentIndex === "string" && /^\d+$/.test(attachmentIndex)
            ? Number(attachmentIndex) : -1;
        const attachments = proposal.attachments?.length
            ? [...proposal.attachments]
            : proposal.attachment ? [proposal.attachment] : [];
        if (index < 0 || index >= attachments.length) {
            throw new ApplicationError("Anexo não encontrado", 404);
        }
        if (attachments.length === 1) {
            throw new ApplicationError("A proposta deve manter ao menos um anexo", 409);
        }

        const [attachmentUrl] = attachments.splice(index, 1);
        await this.storage.setProposalAttachmentTrashed(attachmentUrl, true);

        try {
            const updated = await this.proposals.updateAttachments(proposalId, userId, attachments);
            if (!updated) throw new ApplicationError("Proposta não encontrada", 404);
            return updated;
        } catch (error) {
            await this.storage.setProposalAttachmentTrashed(attachmentUrl, false)
                .catch(restoreError => console.error("Não foi possível restaurar o anexo da proposta:", restoreError));
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
        const existing = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!existing) throw new ApplicationError("Proposta não encontrada", 404);
        if (existing.status !== "sent" && existing.status !== "resent") {
            throw new ApplicationError("Esta proposta não está mais disponível para aprovação", 409);
        }
        const client = await this.requireClient(userId, false);
        const proposal = await this.proposals.decide(proposalId, userId, status, userComment);
        if (!proposal) throw new ApplicationError("Esta proposta não está mais disponível para aprovação", 409);

        try {
            const stageStatus = status === "approved" ? "approved" : "changes-requested";
            const projectState = proposal.stageKey
                ? await this.synchronizeProjectStage(userId, client, proposal.stageKey, stageStatus)
                : this.currentProjectState(client);
            return { proposal, ...projectState };
        } catch (error) {
            await this.restoreProposalStatus(
                proposalId,
                userId,
                status,
                existing.status,
                existing.userComment ?? ""
            );
            throw error;
        }
    }

    private async synchronizeProjectStage(
        userId: string,
        client: { projectStages?: ProjectStage[]; hasFilledBriefing: boolean },
        stageKey: ProjectStageKey,
        status: ProjectStageStatus
    ) {
        const projectStages = projectStagesForProposal(
            client.projectStages,
            client.hasFilledBriefing,
            stageKey,
            status
        );
        const updated = await this.clients.updateProjectStageState(userId, stageKey, projectStages);
        if (!updated) throw new ApplicationError("Cliente não encontrado", 404);
        return { currentStageKey: stageKey, projectStages };
    }

    private currentProjectState(client: {
        currentStageKey?: ProjectStageKey;
        projectStages?: ProjectStage[];
        hasFilledBriefing: boolean;
    }) {
        return {
            currentStageKey: client.currentStageKey ?? "briefing" as ProjectStageKey,
            projectStages: normalizedProjectStages(client.projectStages, client.hasFilledBriefing)
        };
    }

    private async restoreProposalStatus(
        proposalId: string,
        userId: string,
        expectedStatus: ProposalStatus,
        status: ProposalStatus,
        userComment: string
    ): Promise<void> {
        await this.proposals.restoreStatus(proposalId, userId, expectedStatus, status, userComment)
            .catch(rollbackError => console.error("Não foi possível restaurar o status da proposta:", rollbackError));
    }

    private requireObjectId(value: string, message: string): void {
        if (!mongoose.isValidObjectId(value)) throw new ApplicationError(message, 404);
    }

    private requiredText(value: unknown, field: string): string {
        if (typeof value !== "string" || !value.trim()) throw new ApplicationError(`${field} é obrigatório`, 400);
        return value.trim();
    }

    private requiredProposalComment(value: unknown): string {
        const comment = this.requiredText(value, "Comentário");
        if (comment.length > MAX_CLIENT_COMMENT_LENGTH) {
            throw new ApplicationError(`O comentário deve ter no máximo ${MAX_CLIENT_COMMENT_LENGTH} caracteres`, 400);
        }
        return comment;
    }

    private requiredStageKey(value: unknown): ProjectStageKey {
        if (typeof value !== "string" || !projectStageKeys.includes(value as ProjectStageKey)) {
            throw new ApplicationError("Etapa da proposta inválida", 400);
        }
        return value as ProjectStageKey;
    }
}
