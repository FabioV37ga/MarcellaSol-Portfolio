import type { Request, Response, RequestHandler } from "express";

export interface RouteErrorPolicy {
    unexpectedMessage: string;
    invalidDataMessage?: string;
}

export class RouteFailure extends Error {
    constructor(readonly original: unknown, readonly policy: RouteErrorPolicy) {
        super("Falha no processamento da rota");
        this.name = "RouteFailure";
    }
}

export function asyncRoute(
    handler: (request: Request, response: Response) => unknown | Promise<unknown>,
    policy: RouteErrorPolicy
): RequestHandler {
    return async (request, response, next) => {
        try {
            await handler(request, response);
        } catch (error: unknown) {
            next(new RouteFailure(error, policy));
        }
    };
}
