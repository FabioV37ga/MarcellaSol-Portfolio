import mongoose from "mongoose";
import proposals, { type ProposalStatus } from "../models/clientProposal.js";
import type { ProjectStageKey } from "../models/projectStage.js";

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

    decide(id: string, userId: string, status: "approved" | "beated", userComment: string) {
        return proposals.findOneAndUpdate(
            { _id: id, userId, status: { $in: ["sent", "resent"] } },
            { $set: { status, userComment } },
            { new: true, runValidators: true }
        );
    }

    delete(id: string, userId: string) {
        return proposals.findOneAndDelete({ _id: id, userId });
    }
}
