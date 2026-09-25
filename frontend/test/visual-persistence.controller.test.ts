import { describe, expect, it, vi } from "vitest";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";
import type { VisualCacheQuery } from "../src/shared/visual-persistence/visual-cache.types.js";

const clientsQuery: VisualCacheQuery = {
    screen: "clients",
    schemaVersion: 1,
    parameters: { page: "first", filter: undefined }
};

describe("persistência visual em memória", () => {
    it("isola snapshots por instância, identidade, papel e versão", () => {
        const admin = new SessionVisualCache({ role: "admin", subjectId: "admin-a" });
        const anotherAdmin = new SessionVisualCache({ role: "admin", subjectId: "admin-b" });
        const client = new SessionVisualCache({ role: "client", subjectId: "admin-a" });
        admin.set(clientsQuery, [{ id: "client-a" }]);

        expect(admin.get(clientsQuery)).toEqual([{ id: "client-a" }]);
        expect(admin.get({ ...clientsQuery, schemaVersion: 2 })).toBeUndefined();
        expect(anotherAdmin.get(clientsQuery)).toBeUndefined();
        expect(client.get(clientsQuery)).toBeUndefined();
    });

    it("não expõe referências mutáveis e perde tudo ao recriar a aplicação", () => {
        const cache = new SessionVisualCache({ role: "admin", subjectId: "admin-a" });
        const source = [{ id: "client-a", name: "Original" }];
        cache.set(clientsQuery, source);
        source[0].name = "Alterado fora do cache";
        const preview = cache.get<typeof source>(clientsQuery)!;
        preview[0].name = "Alterado na leitura";

        expect(cache.get(clientsQuery)).toEqual([{ id: "client-a", name: "Original" }]);
        expect(new SessionVisualCache({ role: "admin", subjectId: "admin-a" }).get(clientsQuery)).toBeUndefined();
    });

    it("apresenta a prévia imediatamente e sempre publica a resposta oficial", async () => {
        const cache = new SessionVisualCache({ role: "admin", subjectId: "admin-a" });
        cache.set(clientsQuery, [{ id: "client-a", name: "Em cache" }]);
        const controller = new VisualPersistenceController(cache);
        const order: string[] = [];

        const result = await controller.revalidate({
            query: clientsQuery,
            presentPreview: preview => order.push(`preview:${preview[0].name}`),
            load: async () => {
                order.push("request");
                return [{ id: "client-a", name: "Servidor" }];
            },
            publish: (fresh, previous) => order.push(`fresh:${fresh[0].name}:${previous?.[0].name}`)
        });

        expect(order).toEqual(["preview:Em cache", "request", "fresh:Servidor:Em cache"]);
        expect(result).toEqual(expect.objectContaining({ status: "published", hadPreview: true }));
        expect(cache.get(clientsQuery)).toEqual([{ id: "client-a", name: "Servidor" }]);
    });

    it("impede uma resposta antiga de publicar ou sobrescrever o snapshot", async () => {
        const cache = new SessionVisualCache({ role: "admin", subjectId: "admin-a" });
        const controller = new VisualPersistenceController(cache);
        let resolveFirst!: (value: Array<{ id: string }>) => void;
        const firstRequest = new Promise<Array<{ id: string }>>(resolve => { resolveFirst = resolve; });
        const publish = vi.fn();
        const first = controller.revalidate({ query: clientsQuery, load: () => firstRequest, publish });
        const second = controller.revalidate({
            query: clientsQuery,
            load: async () => [{ id: "new" }],
            publish
        });
        await second;
        resolveFirst([{ id: "old" }]);

        expect(await first).toEqual({ status: "stale", hadPreview: false });
        expect(publish).toHaveBeenCalledOnce();
        expect(cache.get(clientsQuery)).toEqual([{ id: "new" }]);
    });

    it("mantém a prévia após falha e invalida ou descarta snapshots explicitamente", async () => {
        const cache = new SessionVisualCache({ role: "client", subjectId: "client-a" });
        cache.set(clientsQuery, [{ id: "confirmed" }]);
        const controller = new VisualPersistenceController(cache);
        const reportError = vi.fn();
        const result = await controller.revalidate({
            query: clientsQuery,
            load: async () => { throw new Error("offline"); },
            publish: vi.fn(),
            reportError
        });

        expect(result).toEqual(expect.objectContaining({ status: "failed", hadPreview: true }));
        expect(reportError).toHaveBeenCalledWith(expect.any(Error), { hasPreview: true });
        expect(cache.get(clientsQuery)).toEqual([{ id: "confirmed" }]);
        controller.invalidate(clientsQuery);
        expect(cache.get(clientsQuery)).toBeUndefined();
        cache.set(clientsQuery, [{ id: "another" }]);
        controller.dispose();
        expect(cache.get(clientsQuery)).toBeUndefined();
        await expect(controller.revalidate({
            query: clientsQuery,
            load: async () => [],
            publish: vi.fn()
        })).rejects.toThrow("descartado");
    });
});
