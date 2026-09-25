import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientsModule } from "../src/admin/modules/clients/admin-clients.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "admin", subjectId: "admin-test" }));
}

async function clientsTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(
        await readFile(path.resolve("../dev/database/admin-clients-view.json"), "utf8")
    ) as { view: string };
    const container = document.createElement("div");
    container.innerHTML = source.view;
    return container.firstElementChild as HTMLElement;
}

describe("AdminClientsModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button id="clients-navigation"></button>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
        HTMLDialogElement.prototype.showModal = function showModal(): void { this.open = true; };
        HTMLDialogElement.prototype.close = function close(): void {
            this.open = false;
            this.dispatchEvent(new Event("close"));
        };
    });

    it("renderiza e remove um cliente após confirmação nominal", async () => {
        const client = {
            id: "client-a",
            name: "Cliente A",
            type: "residencial",
            hasFilledBriefing: true,
            currentStageKey: "briefing" as const,
            currentStageStatus: "completed" as const
        };
        const api = {
            loadClients: vi.fn().mockResolvedValue({
                clients: [client],
                page: { limit: 20, hasMore: false }
            }),
            deleteClient: vi.fn().mockResolvedValue(undefined)
        } as unknown as AdminSystemApi;
        const module = new AdminClientsModule(
            new AdminSystemView(),
            await clientsTemplate(),
            api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(),
            vi.fn(),
            () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        module.mount();
        await vi.waitFor(() => expect(document.querySelector("[data-client-id='client-a']")).not.toBeNull());
        document.querySelector<HTMLButtonElement>("[aria-label='Apagar cliente Cliente A']")!.click();
        const confirmation = document.querySelector<HTMLInputElement>("#client-delete-confirmation")!;
        confirmation.value = "Cliente A";
        confirmation.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector<HTMLFormElement>("#client-delete-form")!
            .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

        await vi.waitFor(() => expect(document.querySelector("[data-client-id='client-a']")).toBeNull());
        expect(api.deleteClient).toHaveBeenCalledWith(
            { token: "test-token", subjectId: "admin-test" }, "client-a", "Cliente A"
        );
    });

    it("acrescenta a próxima página sem recriar os clientes já exibidos", async () => {
        const first = {
            id: "client-a", name: "Cliente A", type: "residencial", hasFilledBriefing: true,
            currentStageKey: "briefing" as const, currentStageStatus: "completed" as const
        };
        const second = {
            ...first, id: "client-b", name: "Cliente B"
        };
        const api = {
            loadClients: vi.fn()
                .mockResolvedValueOnce({
                    clients: [first],
                    page: { limit: 1, hasMore: true, nextCursor: "cursor-2" }
                })
                .mockResolvedValueOnce({
                    clients: [second],
                    page: { limit: 1, hasMore: false }
                }),
            deleteClient: vi.fn()
        } as unknown as AdminSystemApi;
        const module = new AdminClientsModule(
            new AdminSystemView(), await clientsTemplate(), api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(), vi.fn(), () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        module.mount();
        const loadMore = document.querySelector<HTMLButtonElement>("#client-list-load-more")!;
        await vi.waitFor(() => expect(loadMore.hidden).toBe(false));
        expect(document.querySelectorAll(".client-list-client")).toHaveLength(1);
        loadMore.click();

        await vi.waitFor(() => expect(document.querySelectorAll(".client-list-client")).toHaveLength(2));
        expect(api.loadClients).toHaveBeenNthCalledWith(
            2, { token: "test-token", subjectId: "admin-test" }, "cursor-2"
        );
        expect(loadMore.hidden).toBe(true);
        expect(document.querySelector("#client-list-pagination-status")?.textContent)
            .toBe("2 clientes exibidos");
    });

    it("mostra a prévia na segunda visita e preserva o nó inalterado após revalidar", async () => {
        const cached = {
            id: "client-a", name: "Cliente A", type: "residencial", hasFilledBriefing: true,
            currentStageKey: "briefing" as const, currentStageStatus: "completed" as const
        };
        const inserted = { ...cached, id: "client-b", name: "Cliente B" };
        let resolveSecond!: (value: {
            clients: typeof cached[];
            page: { limit: number; hasMore: boolean };
        }) => void;
        const secondRequest = new Promise<{
            clients: typeof cached[];
            page: { limit: number; hasMore: boolean };
        }>(resolve => { resolveSecond = resolve; });
        const api = {
            loadClients: vi.fn()
                .mockResolvedValueOnce({ clients: [cached], page: { limit: 20, hasMore: false } })
                .mockReturnValueOnce(secondRequest),
            deleteClient: vi.fn()
        } as unknown as AdminSystemApi;
        const module = new AdminClientsModule(
            new AdminSystemView(), await clientsTemplate(), api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(), vi.fn(), () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        module.mount();
        await vi.waitFor(() => expect(document.querySelector("[data-client-id='client-a']")).not.toBeNull());
        module.mount();
        const previewNode = document.querySelector<HTMLElement>("[data-client-id='client-a']")!;
        previewNode.dataset.reconciliationMarker = "preserved";
        expect(previewNode).not.toBeNull();
        expect(api.loadClients).toHaveBeenCalledTimes(2);

        resolveSecond({ clients: [cached, inserted], page: { limit: 20, hasMore: false } });
        await vi.waitFor(() => expect(document.querySelector("[data-client-id='client-b']")).not.toBeNull());
        expect(document.querySelector("[data-client-id='client-a']")).toBe(previewNode);
        expect(previewNode.dataset.reconciliationMarker).toBe("preserved");
        expect(api.loadClients).toHaveBeenNthCalledWith(
            2,
            { token: "test-token", subjectId: "admin-test" },
            undefined,
            50
        );
    });

    it("não remove clientes antigos quando uma criação altera o início da listagem", async () => {
        const client = (id: string, name: string) => ({
            id, name, type: "residencial", hasFilledBriefing: false,
            currentStageKey: "briefing" as const, currentStageStatus: "not-started" as const
        });
        const client1 = client("client-1", "Cliente 1");
        const client2 = client("client-2", "Cliente 2");
        const client3 = client("client-3", "Cliente 3");
        const api = {
            loadClients: vi.fn()
                .mockResolvedValueOnce({ clients: [client2, client1], page: { limit: 20, hasMore: false } })
                .mockResolvedValueOnce({ clients: [client3, client2, client1], page: { limit: 50, hasMore: false } }),
            deleteClient: vi.fn()
        } as unknown as AdminSystemApi;
        const module = new AdminClientsModule(
            new AdminSystemView(), await clientsTemplate(), api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(), vi.fn(), () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        module.mount();
        await vi.waitFor(() => expect(document.querySelectorAll(".client-list-client")).toHaveLength(2));
        module.mount();
        await vi.waitFor(() => expect(document.querySelectorAll(".client-list-client")).toHaveLength(3));

        expect(Array.from(document.querySelectorAll<HTMLElement>(".client-list-client"))
            .map(node => node.dataset.clientId)).toEqual(["client-3", "client-2", "client-1"]);
    });
});
