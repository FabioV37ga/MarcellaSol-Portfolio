import mongoose from "mongoose";

export type ReportJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ReportJobDocument {
    clientId: mongoose.Types.ObjectId;
    briefingVersion: Date;
    status: ReportJobStatus;
    attempts: number;
    error?: string;
    startedAt?: Date;
    finishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const reportJobSchema = new mongoose.Schema<ReportJobDocument>({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    briefingVersion: { type: Date, required: true },
    status: { type: String, enum: ["queued", "running", "succeeded", "failed"], required: true, default: "queued", index: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    error: { type: String, maxlength: 500 },
    startedAt: Date,
    finishedAt: Date
}, { collection: "report-jobs", timestamps: true });

reportJobSchema.index({ clientId: 1, briefingVersion: 1 }, { unique: true });
reportJobSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<ReportJobDocument>("ReportJob", reportJobSchema);
