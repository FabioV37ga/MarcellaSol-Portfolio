import mongoose from "mongoose";
import proposals, { type ProposalStatus } from "../models/clientProposal.js";
import type { ProjectStageKey } from "../models/projectStage.js";
import type { ClientProposalResponse } from "../models/clientProposal.js";

export interface CreateProposalData {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    attachments: string[];
    attachmentFolderId: string;
    userComment: string;
    status: ProposalStatus;
    stageKey: ProjectStageKey;
}

export class ClientProposalRepository {
    findByUserId(userId: string) {
        return proposals.find({ userId }).sort({ updatedAt: -1 }).lean();
    }

    findByIdAndUserId(id: string, userId: string) {
        return proposals.findOne({ _id: id, userId });
    }

    create(data: CreateProposalData) {
        return proposals.create(data);
    }

    update(id: string, userId: string, data: Record<string, unknown>) {
        return proposals.findOneAndUpdate({ _id: id, userId }, { $set: data }, { new: true });
    }

    updateAttachments(id: string, userId: string, attachments: string[]) {
        return proposals.findOneAndUpdate(
            { _id: id, userId },
            { $set: { attachments }, $unset: { attachment: 1 } },
            { new: true, runValidators: true }
        );
    }

    decide(
        id: string,
        userId: string,
        status: "approved" | "beated",
        userComment: string,
        response?: ClientProposalResponse,
        attachmentFolderId?: string
    ) {
        const update: Record<string, unknown> = { $set: { status, userComment } };
        if (attachmentFolderId) (update.$set as Record<string, unknown>).attachmentFolderId = attachmentFolderId;
        if (response) update.$push = { clientResponses: response };
        return proposals.findOneAndUpdate(
            { _id: id, userId, status: { $in: ["sent", "resent"] } },
            update,
            { new: true, runValidators: true }
        );
    }

    restoreStatus(
        id: string,
        userId: string,
        expectedStatus: ProposalStatus,
        status: ProposalStatus,
        userComment: string,
        responseId?: mongoose.Types.ObjectId
    ) {
        const update: Record<string, unknown> = { $set: { status, userComment } };
        if (responseId) update.$pull = { clientResponses: { _id: responseId } };
        return proposals.findOneAndUpdate(
            { _id: id, userId, status: expectedStatus },
            update,
            { new: true, runValidators: true }
        );
    }

    delete(id: string, userId: string) {
        return proposals.findOneAndDelete({ _id: id, userId });
    }
}
