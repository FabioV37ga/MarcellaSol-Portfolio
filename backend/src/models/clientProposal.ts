import mongoose from "mongoose";
import { projectStageKeys, type ProjectStageKey } from "./projectStage.js";

export const proposalStatuses = ["sent", "beated", "resent", "approved", "changes-completed", "Cancelled"] as const;
export type ProposalStatus = typeof proposalStatuses[number];

export const proposalReleaseStatuses = ["pending", "processing", "released", "failed", "cancelled"] as const;
export type ProposalReleaseStatus = typeof proposalReleaseStatuses[number];

export interface ProposalRelease {
    scheduledAt: Date;
    status: ProposalReleaseStatus;
    recipients: string[];
    notifiedRecipients: string[];
    attempts: number;
    nextAttemptAt: Date;
    claimId?: string;
    claimedAt?: Date;
    claimExpiresAt?: Date;
    releasedAt?: Date;
    lastFailureCode?: string;
}

export interface ClientProposalResponse {
    _id: mongoose.Types.ObjectId;
    decision: "approved" | "beated";
    comment: string;
    attachments: string[];
    createdAt: Date;
}

export interface ClientProposalObject {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    attachments: string[];
    attachment?: string;
    attachmentFolderId?: string;
    userComment: string;
    clientResponses: ClientProposalResponse[];
    stageKey?: ProjectStageKey;
    status: ProposalStatus;
    release?: ProposalRelease;
    createdAt: Date;
    updatedAt: Date;
}

const clientProposalResponseSchema = new mongoose.Schema<ClientProposalResponse>({
    decision: { type: String, enum: ["approved", "beated"], required: true },
    comment: { type: String, required: true, trim: true },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, required: true, default: Date.now }
});

const proposalReleaseSchema = new mongoose.Schema<ProposalRelease>({
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: proposalReleaseStatuses, required: true },
    recipients: { type: [String], required: true },
    notifiedRecipients: { type: [String], required: true, default: [] },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    nextAttemptAt: { type: Date, required: true },
    claimId: { type: String, required: false },
    claimedAt: { type: Date, required: false },
    claimExpiresAt: { type: Date, required: false },
    releasedAt: { type: Date, required: false },
    lastFailureCode: { type: String, required: false }
}, { _id: false });

const clientProposalSchema = new mongoose.Schema<ClientProposalObject>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachments: { type: [String], required: true, validate: [(value: string[]) => value.length > 0, "Ao menos um anexo é obrigatório"] },
    attachment: { type: String, required: false, select: true },
    attachmentFolderId: { type: String, required: false },
    userComment: { type: String, default: "" },
    clientResponses: { type: [clientProposalResponseSchema], default: [] },
    stageKey: { type: String, enum: projectStageKeys, required: false, index: true },
    status: { type: String, enum: proposalStatuses, default: "sent", required: true },
    release: { type: proposalReleaseSchema, required: false }
}, { collection: "client-proposals", timestamps: true });

export default mongoose.model<ClientProposalObject>("ClientProposal", clientProposalSchema);
