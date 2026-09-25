import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientFinancialModule } from "../src/client/modules/client-financial.module.js";
import type { ClientPaymentPage, ClientPaymentsGateway } from "../src/client/infrastructure/payments.api.js";
import type { system } from "../src/client/templates/interface.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "client", subjectId: "client-test" }));
}

async function financialTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(await readFile(
        resolve("../dev/database/client-financial-client-view.json"),
        "utf8"
    )) as { view: string };
    const template = document.createElement("template");
    template.innerHTML = source.view;
    return template.content.firstElementChild as HTMLElement;
}

describe("ciclo de vida do financeiro do cliente", () => {
    beforeEach(() => {
        document.body.innerHTML = '<main class="page-content"></main>';
    });

    it("ignora carregamento pendente e remove a navegação ao descartar", async () => {
        let resolvePage!: (value: ClientPaymentPage) => void;
        const pending = new Promise<ClientPaymentPage>(resolve => { resolvePage = resolve; });
        const navigate = vi.fn();
        const gateway: ClientPaymentsGateway = {
            loadPayments: vi.fn().mockReturnValue(pending),
            generatePaymentPix: vi.fn()
        };
        const module = new ClientFinancialModule(
            new ClientSystemView(),
            { financial: await financialTemplate() } satisfies system,
            gateway,
            "client-token",
            navigate,
            visualPersistence()
        );

        const mounting = module.mount();
        const back = document.querySelector<HTMLButtonElement>("#client-financial-back")!;
        module.dispose();
        back.click();
        resolvePage({
            payments: [],
            page: { limit: 20, hasMore: false },
            summary: { paymentCount: 0, totalAmountCents: 0, paidAmountCents: 0, remainingAmountCents: 0 }
        });
        await mounting;

        expect(navigate).not.toHaveBeenCalled();
        expect(document.querySelector<HTMLElement>("#client-financial-loading")?.hidden).toBe(false);
        expect(document.querySelector("#client-financial-pagination-status")?.textContent).toBe("");
    });

    it("preserva a cobrança em cache e não armazena o conteúdo secreto do Pix", async () => {
        const payment = {
            id: "payment-1", title: "Projeto", totalAmountCents: 100000,
            installmentCount: 1, firstDueDate: "2026-10-10", downPaymentPercentage: 0,
            discountPercentage: 0, interestPercentage: 0, discountAmountCents: 0,
            downPayment: { amountCents: 0, isPaid: false }, finalAmountCents: 100000,
            paidAmountCents: 0, remainingAmountCents: 100000,
            installments: [{ number: 1, amountCents: 100000, isPaid: false, dueDate: "2026-10-10" }],
            createdAt: "2026-09-25", updatedAt: "2026-09-25"
        };
        const page = {
            payments: [payment], page: { limit: 20, hasMore: false },
            summary: { paymentCount: 1, totalAmountCents: 100000, paidAmountCents: 0, remainingAmountCents: 100000 }
        };
        let release!: (value: ClientPaymentPage) => void;
        const pending = new Promise<ClientPaymentPage>(resolve => { release = resolve; });
        const gateway: ClientPaymentsGateway = {
            loadPayments: vi.fn().mockResolvedValueOnce(page).mockReturnValueOnce(pending),
            generatePaymentPix: vi.fn()
        };
        const module = new ClientFinancialModule(
            new ClientSystemView(),
            { financial: await financialTemplate() } satisfies system,
            gateway,
            "client-token",
            vi.fn(),
            visualPersistence()
        );

        await module.mount();
        const secondMount = module.mount();
        await vi.waitFor(() => expect(document.querySelector("[data-payment-id='payment-1']")).not.toBeNull());
        const previewNode = document.querySelector<HTMLElement>("[data-payment-id='payment-1']")!;
        previewNode.dataset.reconciliationMarker = "preserved";

        release(page);
        await secondMount;

        expect(document.querySelector("[data-payment-id='payment-1']")).toBe(previewNode);
        expect(previewNode.dataset.reconciliationMarker).toBe("preserved");
        expect(gateway.loadPayments).toHaveBeenNthCalledWith(2, "client-token", undefined, 100);
        expect(JSON.stringify(page)).not.toContain("brCode");
        expect(JSON.stringify(page)).not.toContain("qrCodeDataUrl");
    });
});
