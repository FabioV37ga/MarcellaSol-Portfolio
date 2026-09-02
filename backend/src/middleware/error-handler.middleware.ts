import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";

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
