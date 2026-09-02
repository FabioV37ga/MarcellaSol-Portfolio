import { ApplicationError } from "../application/errors/application-error.js";

export interface LoginCredentials {
    login: string;
    password: string;
}

export function loginCredentials(body: unknown): LoginCredentials {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApplicationError("Login e senha são obrigatórios", 400);
    }

    const { login, password } = body as Record<string, unknown>;
    if (typeof login !== "string" || typeof password !== "string") {
        throw new ApplicationError("Credenciais inválidas", 400);
    }

    const normalizedLogin = login.trim();
    if (!normalizedLogin || !password) {
        throw new ApplicationError("Login e senha são obrigatórios", 400);
    }
    if (normalizedLogin.length > 128 || password.length > 1024) {
        throw new ApplicationError("Credenciais inválidas", 400);
    }

    return { login: normalizedLogin, password };
}
