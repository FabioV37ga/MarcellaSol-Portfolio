import type { NextFunction, Request, Response } from "express";
import type { AccountRole, SessionPrincipal } from "../services/session-token.service.js";
import { SessionService } from "../services/session.service.js";

const sessions = new SessionService();

export function requireAuthentication(role: AccountRole) {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const authorization = request.header("Authorization");
            const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
            const principal = token ? await sessions.authenticate(token) : undefined;
            if (!principal || principal.role !== role) {
                response.status(401).json({ message: "Sessão inválida, revogada ou expirada." });
                return;
            }
            response.locals.auth = principal;
            next();
        } catch (error) {
            next(error);
        }
    };
}

export function authenticatedPrincipal(response: Response): SessionPrincipal {
    return response.locals.auth as SessionPrincipal;
}
