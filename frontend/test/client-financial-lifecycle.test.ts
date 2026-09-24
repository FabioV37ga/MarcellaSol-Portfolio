import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientFinancialModule } from "../src/client/modules/client-financial.module.js";
import type { ClientPaymentPage, ClientPaymentsGateway } from "../src/client/infrastructure/payments.api.js";
import type { system } from "../src/client/templates/interface.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";

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
            navigate
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
});
