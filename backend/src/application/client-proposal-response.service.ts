import mongoose from "mongoose";
import type { ClientProposalResponse, ProposalStatus } from "../models/clientProposal.js";
import {
    normalizedProjectStages,
    projectStagesForProposal,
    type ProjectStage,
    type ProjectStageKey
} from "../models/projectStage.js";
import { ClientProposalRepository } from "../repositories/client-proposal.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import type { ProposalStorage } from "../services/proposal-drive.storage.js";
import { ApplicationError } from "./errors/application-error.js";

const MAX_CLIENT_COMMENT_LENGTH = 2000;

export class ClientProposalResponseService {
    constructor(
        private readonly clients: ClientRepository,
        private readonly proposals: ClientProposalRepository,
        private readonly storage: ProposalStorage
    ) { }

    approve(userId: string, proposalId: string, comment: unknown, files: Express.Multer.File[] = []) {
        return this.decide(userId, proposalId, "approved", this.requiredComment(comment), files);
    }

    beat(
        userId: string,
        proposalId: string,
        comment: unknown,
        confirmRevisionRound: unknown,
        files: Express.Multer.File[] = []
    ) {
        if (confirmRevisionRound !== true) {
            throw new ApplicationError("Confirme o uso de 1 rodada de alterações", 400);
        }
        return this.decide(userId, proposalId, "beated", this.requiredComment(comment), files);
    }

    private async decide(
        userId: string,
        proposalId: string,
        status: "approved" | "beated",
        comment: string,
        files: Express.Multer.File[]
    ) {
        this.requireObjectId(userId, "Cliente não encontrado");
        this.requireObjectId(proposalId, "Proposta não encontrada");
        const existing = await this.proposals.findByIdAndUserId(proposalId, userId);
        if (!existing) throw new ApplicationError("Proposta não encontrada", 404);
        if (existing.status !== "sent" && existing.status !== "resent") {
            throw new ApplicationError("Esta proposta não está mais disponível para aprovação", 409);
        }
        const client = await this.requireClient(userId, files.length > 0);
        const responseId = new mongoose.Types.ObjectId();
        let uploadedAttachments: string[] = [];
        let attachmentFolderId = existing.attachmentFolderId;
        if (files.length > 0) {
            const responseIndex = (existing.clientResponses?.length ?? 0) + 1;
            const upload = await this.storage.uploadProposal(
                client.driveFolderId!, proposalId, existing.title, files, "client", responseIndex
            );
            uploadedAttachments = upload.attachmentUrls;
            attachmentFolderId = upload.folderId;
        }
        const response: ClientProposalResponse = {
            _id: responseId,
            decision: status,
            comment,
            attachments: uploadedAttachments,
            createdAt: new Date()
        };
        let proposal;
        try {
            proposal = await this.proposals.decide(
                proposalId, userId, status, comment, response, attachmentFolderId
            );
            if (!proposal) throw new ApplicationError("Esta proposta não está mais disponível para aprovação", 409);
        } catch (error) {
            await this.trashUploads(uploadedAttachments);
            throw error;
        }

        try {
            const stageStatus = status === "approved" ? "approved" : "changes-requested";
            const projectState = proposal.stageKey
                ? await this.synchronizeStage(userId, client, proposal.stageKey, stageStatus)
                : this.currentProjectState(client);
            return { proposal, ...projectState };
        } catch (error) {
            await this.restoreProposal(proposalId, userId, status, existing.status, existing.userComment ?? "", responseId);
            await this.trashUploads(uploadedAttachments);
            throw error;
        }
    }

    private async requireClient(userId: string, requireDriveFolder: boolean) {
        const client = await this.clients.findById(userId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);
        if (requireDriveFolder && !client.driveFolderId) {
            throw new ApplicationError("O cliente não possui pasta configurada no Drive", 409);
        }
        return client;
    }

    private async synchronizeStage(
        userId: string,
        client: { projectStages?: ProjectStage[]; hasFilledBriefing: boolean },
        stageKey: ProjectStageKey,
        status: "approved" | "changes-requested"
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

    private async restoreProposal(
        proposalId: string,
        userId: string,
        expectedStatus: ProposalStatus,
        status: ProposalStatus,
        comment: string,
        responseId: mongoose.Types.ObjectId
    ): Promise<void> {
        await this.proposals.restoreStatus(proposalId, userId, expectedStatus, status, comment, responseId)
            .catch(error => console.error("Não foi possível restaurar o status da proposta:", error));
    }

    private async trashUploads(attachments: string[]): Promise<void> {
        await Promise.all(attachments.map(attachment =>
            this.storage.setProposalAttachmentTrashed(attachment, true)
                .catch(error => console.error("Não foi possível remover anexo sem resposta associada:", error))
        ));
    }

    private requiredComment(value: unknown): string {
        if (typeof value !== "string" || !value.trim()) {
            throw new ApplicationError("Comentário é obrigatório", 400);
        }
        const comment = value.trim();
        if (comment.length > MAX_CLIENT_COMMENT_LENGTH) {
            throw new ApplicationError(`O comentário deve ter no máximo ${MAX_CLIENT_COMMENT_LENGTH} caracteres`, 400);
        }
        return comment;
    }

    private requireObjectId(value: string, message: string): void {
        if (!mongoose.isValidObjectId(value)) throw new ApplicationError(message, 404);
    }
}
