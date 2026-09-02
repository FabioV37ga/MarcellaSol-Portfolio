import { SessionRepository, type SessionStore } from "../repositories/session.repository.js";
import {
    SessionTokenService,
    type SessionIdentity,
    type SessionPrincipal
} from "./session-token.service.js";

export class SessionService {
    constructor(
        private readonly tokens = new SessionTokenService(),
        private readonly sessions: SessionStore = new SessionRepository()
    ) {}

    async issue(identity: SessionIdentity): Promise<string> {
        const issued = this.tokens.issue(identity);
        await this.sessions.create({
            sessionId: issued.sessionId,
            subject: identity.subject,
            role: identity.role,
            expiresAt: new Date(issued.expiresAt * 1000)
        });
        return issued.token;
    }

    async authenticate(token: string): Promise<SessionPrincipal | undefined> {
        const principal = this.tokens.verify(token);
        if (!principal || !await this.sessions.isActive(principal)) return undefined;
        return principal;
    }

    async revoke(principal: SessionPrincipal): Promise<void> {
        await this.sessions.revoke(principal);
    }
}
