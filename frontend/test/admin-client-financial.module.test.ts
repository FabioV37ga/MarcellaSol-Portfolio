import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminClientFinancialModule } from "../src/admin/modules/clients/admin-client-financial.module.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "admin", subjectId: "admin-test" }));
}

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
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(),
            navigateToClient,
            () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        await module.mount("client-financial");

        expect(document.querySelector("#financial-title-name")?.textContent).toBe("Cliente Financeiro");
        expect(document.querySelector("#financial-payments-list")?.textContent)
            .toContain("Nenhum pagamento cadastrado");
        expect(api.loadPayments).toHaveBeenCalledWith(
            { token: "test-token", subjectId: "admin-test" }, "client-financial", undefined, undefined
        );
        document.querySelector<HTMLButtonElement>("#financial-back")!.click();
        expect(navigateToClient).toHaveBeenCalledWith("client-financial");
    });

    it("preserva o card financeiro em cache durante a revalidação", async () => {
        const payment = {
            id: "payment-1", version: 1, clientId: "client-financial", title: "Projeto",
            totalAmountCents: 100000, installmentCount: 1, firstDueDate: "2026-10-10",
            downPaymentPercentage: 0, discountPercentage: 0, interestPercentage: 0,
            discountAmountCents: 0, financedAmountCents: 100000, interestAmountCents: 0,
            installmentTotalCents: 100000, downPayment: { amountCents: 0, isPaid: false },
            finalAmountCents: 100000, paidAmountCents: 0, remainingAmountCents: 100000,
            installments: [{ number: 1, amountCents: 100000, isPaid: false, dueDate: "2026-10-10" }],
            financialTermsLocked: false, createdAt: "2026-09-25", updatedAt: "2026-09-25"
        };
        const page = {
            payments: [payment], page: { limit: 20, hasMore: false },
            summary: { paymentCount: 1, totalAmountCents: 100000, paidAmountCents: 0, remainingAmountCents: 100000 }
        };
        let release!: (value: typeof page) => void;
        const pending = new Promise<typeof page>(resolve => { release = resolve; });
        const api = {
            loadClient: vi.fn().mockResolvedValue({ name: "Cliente Financeiro" }),
            loadPayments: vi.fn().mockResolvedValueOnce(page).mockReturnValueOnce(pending)
        } as unknown as AdminSystemApi;
        const module = new AdminClientFinancialModule(
            new AdminSystemView(), await financialTemplate(), api,
            { token: "test-token", subjectId: "admin-test" }, vi.fn(), vi.fn(), () => undefined,
            visualPersistence()
        );

        await module.mount("client-financial");
        const secondMount = module.mount("client-financial");
        await vi.waitFor(() => expect(document.querySelector("[data-payment-id='payment-1']")).not.toBeNull());
        const previewNode = document.querySelector<HTMLElement>("[data-payment-id='payment-1']")!;
        previewNode.dataset.reconciliationMarker = "preserved";

        release(page);
        await secondMount;

        expect(document.querySelector("[data-payment-id='payment-1']")).toBe(previewNode);
        expect(previewNode.dataset.reconciliationMarker).toBe("preserved");
        expect(api.loadPayments).toHaveBeenNthCalledWith(
            2, { token: "test-token", subjectId: "admin-test" }, "client-financial", undefined, 100
        );
    });
});
