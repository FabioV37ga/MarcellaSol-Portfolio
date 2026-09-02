import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

function loginRateLimit(limit: number, identifier: string) {
    return rateLimit({
        windowMs: WINDOW_MS,
        limit,
        identifier,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { message: "Muitas tentativas de login. Aguarde antes de tentar novamente." }
    });
}

export const adminLoginRateLimit = loginRateLimit(5, "admin-login");
export const clientLoginRateLimit = loginRateLimit(10, "client-login");
