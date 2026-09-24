import mongoose from "mongoose";
import { ApplicationError } from "../errors/application-error.js";

export const DEFAULT_CLIENT_PAGE_SIZE = 20;
export const MAX_CLIENT_PAGE_SIZE = 50;

export interface ClientPageCursor {
    id: mongoose.Types.ObjectId;
}

export interface ClientPageOptions {
    limit: number;
    cursor?: ClientPageCursor;
}

export function clientPageOptions(cursorValue?: unknown, limitValue?: unknown): ClientPageOptions {
    const limit = typeof limitValue === "string" && /^\d+$/.test(limitValue)
        ? Number(limitValue)
        : DEFAULT_CLIENT_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CLIENT_PAGE_SIZE) {
        throw new ApplicationError(`O limite deve estar entre 1 e ${MAX_CLIENT_PAGE_SIZE}`, 400);
    }
    if (cursorValue === undefined || cursorValue === "") return { limit };
    if (typeof cursorValue !== "string") throw new ApplicationError("Cursor de paginação inválido", 400);

    try {
        const decoded = JSON.parse(Buffer.from(cursorValue, "base64url").toString("utf8")) as { id?: unknown };
        if (typeof decoded.id !== "string" || !mongoose.isValidObjectId(decoded.id)) throw new Error();
        return { limit, cursor: { id: new mongoose.Types.ObjectId(decoded.id) } };
    } catch {
        throw new ApplicationError("Cursor de paginação inválido", 400);
    }
}

export function encodeClientCursor(id: mongoose.Types.ObjectId): string {
    return Buffer.from(JSON.stringify({ id: id.toString() }), "utf8").toString("base64url");
}
