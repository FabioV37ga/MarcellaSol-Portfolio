import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ApplicationError } from "../application/errors/application-error.js";
import { RouteFailure } from "./async-route.js";

interface HttpParserError extends Error {
    status?: number;
    type?: string;
}

export const notFoundHandler: RequestHandler = (_request, response) => {
    response.status(404).json({ message: "Rota não encontrada." });
};

export const errorHandler: ErrorRequestHandler = (error: HttpParserError, request, response, next) => {
    if (response.headersSent) {
        next(error);
        return;
    }

    const original = error instanceof RouteFailure ? error.original : error;
    if (original instanceof ApplicationError) {
        response.status(original.status).json({ message: original.message });
        return;
    }
    if (error instanceof RouteFailure) {
        const { policy } = error;
        const invalidDataMessage = original instanceof mongoose.Error.ValidationError
            ? policy.validationErrorMessage
            : original instanceof mongoose.Error.CastError ? policy.castErrorMessage : undefined;
        if (invalidDataMessage) {
            response.status(400).json({ message: invalidDataMessage });
            return;
        }
        console.error(policy.unexpectedMessage, original instanceof Error ? original.name : "UnknownError");
        response.status(500).json({ message: policy.unexpectedMessage });
        return;
    }

    if (error.type === "entity.parse.failed") {
        response.status(400).json({ message: "JSON inválido." });
        return;
    }
    if (error.type === "entity.too.large" || error.status === 413) {
        response.status(413).json({ message: "Corpo da requisição excede o limite permitido." });
        return;
    }
    if (error.status === 415) {
        response.status(415).json({ message: "Tipo de conteúdo não suportado." });
        return;
    }

    const requestId = randomUUID();
    console.error(`[${requestId}] Erro não tratado em ${request.method} ${request.path}:`, error);
    response.status(500).json({ message: "Erro interno do servidor.", requestId });
};
