import { describe, expect, it, vi } from "vitest";
import { AdminClientsApi } from "../src/admin/infrastructure/clients.api.js";
import { AdminViewsApi } from "../src/admin/infrastructure/views.api.js";
import { ClientViewsApi } from "../src/client/infrastructure/views.api.js";
import type { HttpClient } from "../src/shared/http/http-client.js";

describe("APIs de clientes e views", () => {
    it("carrega cliente com identificador codificado e sessão", async () => {
        const client = { id: "cliente/1", name: "Cliente", projectStages: [] };
        const request = vi.fn().mockResolvedValue({ client });
        const api = new AdminClientsApi({ request } as unknown as HttpClient);
        await expect(api.loadClient({ token: "admin-token" }, "cliente/1")).resolves.toBe(client);
        expect(request).toHaveBeenCalledWith("/admin/clients/cliente%2F1", { token: "admin-token" });
    });

    it("atualiza etapa por JSON no transporte compartilhado", async () => {
        const result = { currentStageKey: "layout", projectStages: [] };
        const request = vi.fn().mockResolvedValue(result);
        const api = new AdminClientsApi({ request } as unknown as HttpClient);
        await expect(api.updateClientProjectStage({ token: "token" }, "id", "layout", "in-progress")).resolves.toBe(result);
        expect(request).toHaveBeenCalledWith("/admin/clients/id/project-stage", {
            method: "PATCH", token: "token", json: { stageKey: "layout", status: "in-progress" }
        });
    });

    it("carrega views administrativas e do cliente por gateways próprios", async () => {
        const adminRequest = vi.fn().mockResolvedValue({ view: [{ viewName: "home" }] });
        const clientResponse = { view: [], clientObject: { id: "1" } };
        const clientRequest = vi.fn().mockResolvedValue(clientResponse);
        await expect(new AdminViewsApi({ request: adminRequest } as unknown as HttpClient).loadViews({ token: "admin" })).resolves.toEqual([{ viewName: "home" }]);
        await expect(new ClientViewsApi({ request: clientRequest } as unknown as HttpClient).load("client")).resolves.toBe(clientResponse);
    });

    it("carrega as views do briefing administrativo pelo transporte compartilhado", async () => {
        const request = vi.fn().mockResolvedValue({ views: [{ viewName: "briefing-home" }] });
        const api = new AdminViewsApi({ request } as unknown as HttpClient);

        await expect(api.loadBriefingViews({ token: "admin-token" })).resolves.toEqual([
            { viewName: "briefing-home" }
        ]);
        expect(request).toHaveBeenCalledWith("/view/admin/briefing", {
            method: "POST", token: "admin-token", json: {}
        });
    });
});
