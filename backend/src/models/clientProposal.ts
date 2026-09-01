import mongoose from "mongoose";

export const proposalStatuses = ["sent", "beated", "resent", "Cancelled"] as const;
export type ProposalStatus = typeof proposalStatuses[number];

export interface ClientProposalObject {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    attachments: string[];
    attachment?: string;
    attachmentFolderId?: string;
    userComment: string;
    status: ProposalStatus;
    createdAt: Date;
    updatedAt: Date;
}

const clientProposalSchema = new mongoose.Schema<ClientProposalObject>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachments: { type: [String], required: true, validate: [(value: string[]) => value.length > 0, "Ao menos um anexo é obrigatório"] },
    attachment: { type: String, required: false, select: true },
    attachmentFolderId: { type: String, required: false },
    userComment: { type: String, default: "" },
    status: { type: String, enum: proposalStatuses, default: "sent", required: true }
}, { collection: "client-proposals", timestamps: true });

export default mongoose.model<ClientProposalObject>("ClientProposal", clientProposalSchema);
