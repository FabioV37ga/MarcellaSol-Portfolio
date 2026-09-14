import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminClientFinancialModule } from "../src/admin/modules/admin-client-financial.module.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";

async function financialTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(
        await readFile(path.resolve("../dev/database/client-financial-view.json"), "utf8")
    ) as { view: string };
    const container = document.createElement("div");
    container.innerHTML = source.view;
    return container.firstElementChild as HTMLElement;
}

describe("AdminClientFinancialModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button id="clients-navigation"></button>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
    });

    it("carrega cliente e página financeira na view persistida", async () => {
        const api = {
            loadClient: vi.fn().mockResolvedValue({ name: "Cliente Financeiro" }),
            loadPayments: vi.fn().mockResolvedValue({
                payments: [],
                page: { limit: 20, hasMore: false },
                summary: {
                    paymentCount: 0,
                    totalAmountCents: 0,
                    paidAmountCents: 0,
                    remainingAmountCents: 0
                }
            })
        } as unknown as AdminSystemApi;
        const navigateToClient = vi.fn();
        const module = new AdminClientFinancialModule(
            new AdminSystemView(),
            await financialTemplate(),
            api,
            { token: "test-token" },
            vi.fn(),
            navigateToClient,
            () => document.querySelector<HTMLElement>("#clients-navigation")!
        );

        await module.mount("client-financial");

        expect(document.querySelector("#financial-title-name")?.textContent).toBe("Cliente Financeiro");
        expect(document.querySelector("#financial-payments-list")?.textContent)
            .toContain("Nenhum pagamento cadastrado");
        expect(api.loadPayments).toHaveBeenCalledWith({ token: "test-token" }, "client-financial");
        document.querySelector<HTMLButtonElement>("#financial-back")!.click();
        expect(navigateToClient).toHaveBeenCalledWith("client-financial");
    });
});
