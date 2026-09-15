import mongoose from "mongoose";
import { projectStageKeys, type ProjectStageKey } from "./projectStage.js";

export const proposalStatuses = ["sent", "beated", "resent", "approved", "changes-completed", "Cancelled"] as const;
export type ProposalStatus = typeof proposalStatuses[number];

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
    createdAt: Date;
    updatedAt: Date;
}

const clientProposalResponseSchema = new mongoose.Schema<ClientProposalResponse>({
    decision: { type: String, enum: ["approved", "beated"], required: true },
    comment: { type: String, required: true, trim: true },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, required: true, default: Date.now }
});

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
    status: { type: String, enum: proposalStatuses, default: "sent", required: true }
}, { collection: "client-proposals", timestamps: true });

export default mongoose.model<ClientProposalObject>("ClientProposal", clientProposalSchema);
