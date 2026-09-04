import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type AccountRole = "admin" | "client";

export interface SessionIdentity {
    subject: string;
    role: AccountRole;
    login: string;
    name: string;
}

export interface SessionPrincipal extends SessionIdentity {
    sessionId: string;
}

interface TokenPayload extends SessionPrincipal {
    expiresAt: number;
}

export interface IssuedSessionToken {
    token: string;
    sessionId: string;
    expiresAt: number;
}

const ADMIN_TOKEN_DURATION_SECONDS = 8 * 60 * 60;
const CLIENT_TOKEN_DURATION_SECONDS = 7 * 24 * 60 * 60;

export class SessionTokenService {
    issue(identity: SessionIdentity): IssuedSessionToken {
        const sessionId = randomBytes(32).toString("base64url");
        const duration = identity.role === "admin" ? ADMIN_TOKEN_DURATION_SECONDS : CLIENT_TOKEN_DURATION_SECONDS;
        const expiresAt = Math.floor(Date.now() / 1000) + duration;
        const payload: TokenPayload = {
            ...identity,
            sessionId,
            expiresAt
        };
        const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
        return {
            token: `${encoded}.${this.sign(encoded)}`,
            sessionId,
            expiresAt
        };
    }

    verify(token: string): SessionPrincipal | undefined {
        const parts = token.split(".");
        if (parts.length !== 2) return undefined;
        const [encoded, signature] = parts;
        if (!encoded || !signature) return undefined;

        const expected = Buffer.from(this.sign(encoded));
        const received = Buffer.from(signature);
        if (expected.length !== received.length || !timingSafeEqual(expected, received)) return undefined;

        try {
            const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
            if (!payload.subject || !payload.login || !payload.name || !payload.sessionId
                || (payload.role !== "admin" && payload.role !== "client")
                || !Number.isInteger(payload.expiresAt)
                || payload.expiresAt <= Math.floor(Date.now() / 1000)) return undefined;
            return {
                subject: payload.subject,
                role: payload.role,
                login: payload.login,
                name: payload.name,
                sessionId: payload.sessionId
            };
        } catch {
            return undefined;
        }
    }

    private sign(value: string): string {
        const secret = process.env.AUTH_TOKEN_SECRET?.trim();
        if (!secret || secret.length < 32) {
            throw new Error("AUTH_TOKEN_SECRET deve possuir pelo menos 32 caracteres");
        }
        return createHmac("sha256", secret).update(value).digest("base64url");
    }
}
