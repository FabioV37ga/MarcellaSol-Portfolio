import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

function financialRateLimit(limit: number, identifier: string) {
    return rateLimit({
        windowMs: WINDOW_MS,
        limit,
        identifier,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { message: "Muitas requisições financeiras. Aguarde antes de tentar novamente." }
    });
}

export const financialReadRateLimit = financialRateLimit(120, "financial-read");
export const financialMutationRateLimit = financialRateLimit(40, "financial-mutation");
