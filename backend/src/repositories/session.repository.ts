import AuthSession from "../models/authSession.js";
import type { AccountRole, SessionPrincipal } from "../services/session-token.service.js";

export interface NewSessionRecord {
    sessionId: string;
    subject: string;
    role: AccountRole;
    expiresAt: Date;
}

export interface SessionStore {
    create(session: NewSessionRecord): Promise<void>;
    isActive(principal: SessionPrincipal): Promise<boolean>;
    revoke(principal: SessionPrincipal): Promise<void>;
}

export class SessionRepository implements SessionStore {
    async create(session: NewSessionRecord): Promise<void> {
        await AuthSession.create(session);
    }

    async isActive(principal: SessionPrincipal): Promise<boolean> {
        const session = await AuthSession.exists({
            sessionId: principal.sessionId,
            subject: principal.subject,
            role: principal.role,
            revokedAt: null,
            expiresAt: { $gt: new Date() }
        });
        return Boolean(session);
    }

    async revoke(principal: SessionPrincipal): Promise<void> {
        await AuthSession.updateOne({
            sessionId: principal.sessionId,
            subject: principal.subject,
            role: principal.role,
            revokedAt: null
        }, {
            $set: { revokedAt: new Date() }
        });
    }
}
