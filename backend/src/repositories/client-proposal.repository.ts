import mongoose from "mongoose";
import proposals, { type ProposalStatus } from "../models/clientProposal.js";
import type { ProjectStageKey } from "../models/projectStage.js";
import type { ClientProposalResponse } from "../models/clientProposal.js";
import type { ProposalPageOptions } from "../application/pagination/proposal-list-pagination.js";

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
    async findPageByUserId(userId: string, options: ProposalPageOptions) {
        const cursor = options.cursor;
        const records = await proposals.find({
            userId,
            ...(cursor ? {
                $or: [
                    { updatedAt: { $lt: cursor.updatedAt } },
                    { updatedAt: cursor.updatedAt, _id: { $lt: cursor.id } }
                ]
            } : {})
        }).sort({ updatedAt: -1, _id: -1 }).limit(options.limit + 1).lean();
        return { records: records.slice(0, options.limit), hasMore: records.length > options.limit };
    }

    findByIdAndUserId(id: string, userId: string) {
        return proposals.findOne({ _id: id, userId });
    }

    create(data: CreateProposalData) {
        return proposals.create(data);
    }

    update(id: string, userId: string, data: Record<string, unknown>) {
        return proposals.findOneAndUpdate(
            { _id: id, userId },
            { $set: data },
            { returnDocument: "after" }
        );
    }

    updateAttachments(id: string, userId: string, attachments: string[]) {
        return proposals.findOneAndUpdate(
            { _id: id, userId },
            { $set: { attachments }, $unset: { attachment: 1 } },
            { returnDocument: "after", runValidators: true }
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
            { returnDocument: "after", runValidators: true }
        );
    }

    completeChanges(id: string, userId: string) {
        return proposals.findOneAndUpdate(
            { _id: id, userId, status: "beated" },
            { $set: { status: "changes-completed" } },
            { returnDocument: "after", runValidators: true }
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
            { returnDocument: "after", runValidators: true }
        );
    }

    delete(id: string, userId: string) {
        return proposals.findOneAndDelete({ _id: id, userId });
    }
}
