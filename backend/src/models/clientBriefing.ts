import mongoose from "mongoose";

export interface ClientBriefingDocument {
    clientId: mongoose.Types.ObjectId;
    clientLogin: string;
    briefingDefinition: Record<string, unknown>;
    responses: Record<string, unknown>;
    driveFolderId?: string;
    attachments: Record<string, unknown>[];
    submittedAt: Date;
}

const clientBriefingSchema = new mongoose.Schema<ClientBriefingDocument>({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        unique: true,
        index: true
    },
    clientLogin: { type: String, required: true, index: true },
    briefingDefinition: { type: mongoose.Schema.Types.Mixed, required: true },
    responses: { type: mongoose.Schema.Types.Mixed, required: true },
    driveFolderId: { type: String, required: false },
    attachments: { type: mongoose.Schema.Types.Mixed, required: true, default: [] },
    submittedAt: { type: Date, required: true, default: Date.now }
}, {
    collection: "client-briefings",
    timestamps: true
});

export default mongoose.model<ClientBriefingDocument>("ClientBriefing", clientBriefingSchema);
