import mongoose from "mongoose";
import { ApplicationError } from "../errors/application-error.js";

export const DEFAULT_PROPOSAL_PAGE_SIZE = 20;
export const MAX_PROPOSAL_PAGE_SIZE = 50;

export interface ProposalPageCursor {
    updatedAt: Date;
    id: mongoose.Types.ObjectId;
}

export interface ProposalPageOptions {
    limit: number;
    cursor?: ProposalPageCursor;
}

export function proposalPageOptions(cursorValue?: unknown, limitValue?: unknown): ProposalPageOptions {
    const limit = typeof limitValue === "string" && /^\d+$/.test(limitValue)
        ? Number(limitValue)
        : DEFAULT_PROPOSAL_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PROPOSAL_PAGE_SIZE) {
        throw new ApplicationError(`O limite deve estar entre 1 e ${MAX_PROPOSAL_PAGE_SIZE}`, 400);
    }
    if (cursorValue === undefined || cursorValue === "") return { limit };
    if (typeof cursorValue !== "string") throw new ApplicationError("Cursor de paginação inválido", 400);

    try {
        const decoded = JSON.parse(Buffer.from(cursorValue, "base64url").toString("utf8")) as {
            updatedAt?: unknown;
            id?: unknown;
        };
        const updatedAt = typeof decoded.updatedAt === "string" ? new Date(decoded.updatedAt) : undefined;
        if (!updatedAt || Number.isNaN(updatedAt.getTime())
            || typeof decoded.id !== "string" || !mongoose.isValidObjectId(decoded.id)) throw new Error();
        return { limit, cursor: { updatedAt, id: new mongoose.Types.ObjectId(decoded.id) } };
    } catch {
        throw new ApplicationError("Cursor de paginação inválido", 400);
    }
}

export function encodeProposalCursor(updatedAt: Date, id: mongoose.Types.ObjectId): string {
    return Buffer.from(JSON.stringify({ updatedAt: updatedAt.toISOString(), id: id.toString() }), "utf8")
        .toString("base64url");
}
