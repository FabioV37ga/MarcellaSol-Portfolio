import mongoose from "mongoose";
import type { AccountRole } from "../services/session-token.service.js";

export interface AuthSessionObject {
    sessionId: string;
    subject: string;
    role: AccountRole;
    expiresAt: Date;
    revokedAt?: Date;
}

const authSessionSchema = new mongoose.Schema<AuthSessionObject>({
    sessionId: { type: String, required: true, unique: true },
    subject: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["admin", "client"] },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, required: false }
}, {
    collection: "authSessions",
    timestamps: true,
    versionKey: false
});

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ subject: 1, role: 1, revokedAt: 1 });

export default mongoose.model<AuthSessionObject>("AuthSession", authSessionSchema);
