import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import type { PixReceiver } from "../services/pix-br-code.js";

export interface ApplicationConfig {
    environmentPath: string;
    databaseUri: string;
    port: number;
    isProduction: boolean;
    trustProxyHops: number;
    pixReceiver: PixReceiver;
}

export interface LoadApplicationConfigOptions {
    cwd?: string;
    environment?: NodeJS.ProcessEnv;
}

export function loadApplicationConfig(options: LoadApplicationConfigOptions = {}): ApplicationConfig {
    const cwd = options.cwd ?? process.cwd();
    const environment = options.environment ?? process.env;
    const candidates = [path.resolve(cwd, "backend", ".env"), path.resolve(cwd, ".env")];
    const environmentPath = candidates.find(candidate => fs.existsSync(candidate));

    if (environmentPath) {
        const result = dotenv.config({
            path: environmentPath,
            override: false,
            processEnv: environment,
            quiet: true
        });
        if (result.error) throw result.error;
    }

    return applicationConfigFromEnvironment(environment, environmentPath ?? "variáveis do processo");
}

export function applicationConfigFromEnvironment(
    environment: NodeJS.ProcessEnv,
    environmentPath = ".env"
): ApplicationConfig {
    const databaseUri = required(environment, "DB_CONNECTION_STRING");
    const authTokenSecret = required(environment, "AUTH_TOKEN_SECRET");
    if (authTokenSecret.length < 32) {
        throw new Error("AUTH_TOKEN_SECRET deve ser configurado no .env com pelo menos 32 caracteres");
    }

    const port = integer(environment.PORT ?? "3000", "PORT", 1, 65_535);
    const trustProxyHops = integer(environment.TRUST_PROXY_HOPS ?? "0", "TRUST_PROXY_HOPS", 0, 10);
    const pixReceiver = validatePixReceiver({
        key: required(environment, "PIX_RECEIVER_KEY"),
        name: required(environment, "PIX_RECEIVER_NAME"),
        city: required(environment, "PIX_RECEIVER_CITY")
    });

    return Object.freeze({
        environmentPath,
        databaseUri,
        port,
        isProduction: environment.NODE_ENV === "production",
        trustProxyHops,
        pixReceiver: Object.freeze(pixReceiver)
    });
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`${name} deve ser configurado no .env`);
    return value;
}

function integer(value: string, name: string, minimum: number, maximum: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new Error(`${name} deve ser um número inteiro entre ${minimum} e ${maximum}`);
    }
    return parsed;
}

function validatePixReceiver(receiver: PixReceiver): PixReceiver {
    if (receiver.key.length > 77) throw new Error("PIX_RECEIVER_KEY deve ter no máximo 77 caracteres");
    const normalizedName = normalizedPixText(receiver.name);
    const normalizedCity = normalizedPixText(receiver.city);
    if (!normalizedName) throw new Error("PIX_RECEIVER_NAME não possui caracteres válidos para o Pix");
    if (normalizedName.length > 25) throw new Error("PIX_RECEIVER_NAME deve ter no máximo 25 caracteres válidos para o Pix");
    if (!normalizedCity) throw new Error("PIX_RECEIVER_CITY não possui caracteres válidos para o Pix");
    if (normalizedCity.length > 15) throw new Error("PIX_RECEIVER_CITY deve ter no máximo 15 caracteres válidos para o Pix");
    return receiver;
}

function normalizedPixText(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
        .replace(/[^A-Z0-9 $%*+\-./:]/g, " ").trim();
}
