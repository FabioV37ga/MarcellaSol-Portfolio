import { config } from "@/utils/connection.js";
import { HttpError } from "./http-error.js";

export interface HttpRequestOptions extends Omit<RequestInit, "body" | "headers"> {
    token?: string;
    json?: unknown;
    body?: BodyInit | null;
    headers?: HeadersInit;
    acceptedStatuses?: readonly number[];
}

export class HttpClient {
    constructor(private readonly baseUrl: string) { }

    async request<T = undefined>(path: string, options: HttpRequestOptions = {}): Promise<T> {
        const { token, json, body, headers: customHeaders, acceptedStatuses = [], ...requestOptions } = options;
        const headers = new Headers(customHeaders);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        if (json !== undefined) headers.set("Content-Type", "application/json");

        const response = await fetch(this.url(path), {
            ...requestOptions,
            headers,
            body: json === undefined ? body : JSON.stringify(json)
        });
        const payload = await this.readPayload(response);
        if (!response.ok && !acceptedStatuses.includes(response.status)) {
            throw new HttpError(this.errorMessage(payload, response.status), response.status, payload);
        }
        return payload as T;
    }

    private url(path: string): string {
        return `${this.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    }

    private async readPayload(response: Response): Promise<unknown> {
        if (response.status === 204) return undefined;
        const text = await response.text();
        if (!text) return undefined;
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) return text;
        try {
            return JSON.parse(text) as unknown;
        } catch {
            throw new HttpError("O servidor retornou uma resposta inválida.", response.status);
        }
    }

    private errorMessage(payload: unknown, status: number): string {
        if (payload && typeof payload === "object" && "message" in payload) {
            const message = (payload as { message?: unknown }).message;
            if (typeof message === "string" && message.trim()) return message;
        }
        return `Não foi possível concluir a solicitação (${status}).`;
    }
}

export const httpClient = new HttpClient(config.apiBaseUrl);
