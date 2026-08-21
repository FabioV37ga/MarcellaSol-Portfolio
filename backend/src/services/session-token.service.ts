import { createHmac, timingSafeEqual } from "node:crypto";

export type AccountRole = "admin" | "client";

export interface SessionPrincipal {
    subject: string;
    role: AccountRole;
    login: string;
    name: string;
}

interface TokenPayload extends SessionPrincipal {
    expiresAt: number;
}

const TOKEN_DURATION_SECONDS = 7 * 24 * 60 * 60;

export class SessionTokenService {
    issue(principal: SessionPrincipal): string {
        const payload: TokenPayload = {
            ...principal,
            expiresAt: Math.floor(Date.now() / 1000) + TOKEN_DURATION_SECONDS
        };
        const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
        return `${encoded}.${this.sign(encoded)}`;
    }

    verify(token: string): SessionPrincipal | undefined {
        const [encoded, signature] = token.split(".");
        if (!encoded || !signature) return undefined;

        const expected = Buffer.from(this.sign(encoded));
        const received = Buffer.from(signature);
        if (expected.length !== received.length || !timingSafeEqual(expected, received)) return undefined;

        try {
            const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
            if (!payload.subject || !payload.login || !payload.name
                || (payload.role !== "admin" && payload.role !== "client")
                || payload.expiresAt <= Math.floor(Date.now() / 1000)) return undefined;
            return { subject: payload.subject, role: payload.role, login: payload.login, name: payload.name };
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
