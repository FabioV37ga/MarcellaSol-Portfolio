import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../src/shared/http/http-client.js";
import { HttpError } from "../src/shared/http/http-error.js";

describe("HttpClient", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("centraliza URL, autenticação e serialização JSON", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ ok: true }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        ));
        vi.stubGlobal("fetch", fetchMock);

        const result = await new HttpClient("https://example.test/api/").request<{ ok: boolean }>(
            "/resource",
            { method: "POST", token: "token-test", json: { name: "Teste" } }
        );

        expect(result).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledWith("https://example.test/api/resource", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "Teste" })
        }));
        const headers = fetchMock.mock.calls[0][1].headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer token-test");
        expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("traduz erro HTTP e aceita respostas sem conteúdo", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Sessão inválida" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = new HttpClient("https://example.test/api");

        await expect(client.request("/session")).rejects.toEqual(
            expect.objectContaining<HttpError>({ name: "HttpError", message: "Sessão inválida", status: 401 })
        );
        await expect(client.request("/logout", { method: "POST" })).resolves.toBeUndefined();
    });
});
