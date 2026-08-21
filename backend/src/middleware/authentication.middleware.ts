import type { NextFunction, Request, Response } from "express";
import { SessionTokenService, type AccountRole, type SessionPrincipal } from "../services/session-token.service.js";

const tokens = new SessionTokenService();

export function requireAuthentication(role: AccountRole) {
    return (request: Request, response: Response, next: NextFunction): void => {
        const authorization = request.header("Authorization");
        const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        const principal = token ? tokens.verify(token) : undefined;
        if (!principal || principal.role !== role) {
            response.status(401).json({ message: "Sessão inválida ou expirada." });
            return;
        }
        response.locals.auth = principal;
        next();
    };
}

export function authenticatedPrincipal(response: Response): SessionPrincipal {
    return response.locals.auth as SessionPrincipal;
}
