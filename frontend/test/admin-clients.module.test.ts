import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientsModule } from "../src/admin/modules/admin-clients.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";

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
            loadClients: vi.fn().mockResolvedValue([client]),
            deleteClient: vi.fn().mockResolvedValue(undefined)
        } as unknown as AdminSystemApi;
        const module = new AdminClientsModule(
            new AdminSystemView(),
            await clientsTemplate(),
            api,
            { token: "test-token" },
            vi.fn(),
            vi.fn(),
            () => document.querySelector<HTMLElement>("#clients-navigation")!
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
            { token: "test-token" }, "client-a", "Cliente A"
        );
    });
});
