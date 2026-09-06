import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientFinancialManager } from "../src/admin/ui/client-financial-manager.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import type { ClientFinancialElements } from "../src/admin/selectors/client-financial.selector.js";

describe("prévia financeira administrativa", () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.replaceChildren();
    });

    it("preserva as linhas e o scroll ao marcar uma parcela como paga", async () => {
        vi.useFakeTimers();
        installDialogMethods();
        document.body.innerHTML = financialView();
        const elements = financialElements();
        const api = {
            previewPayment: vi.fn().mockResolvedValue({
                downPaymentCents: 0,
                firstDueDate: "2026-09-06",
                installments: [
                    { amountCents: 50000, dueDate: "2026-10-06" },
                    { amountCents: 50000, dueDate: "2026-11-06" }
                ],
                finalAmountCents: 100000
            })
        } as unknown as AdminSystemApi;
        const manager = new ClientFinancialManager(elements, api, { token: "token" }, "client-1", []);

        elements.newPayment.click();
        setInput("#financial-payment-total", "1000");
        setInput("#financial-payment-count", "2");
        setInput("#financial-payment-first-due-date", "2026-09-06");
        await vi.advanceTimersByTimeAsync(250);

        const initialInstallment = elements.root.querySelector<HTMLInputElement>('input[data-part="1"]')!;

        setInput("#financial-payment-total", "1001");
        setInput("#financial-payment-total", "1002");
        expect(elements.root.querySelector("#financial-payment-preview")?.hidden).toBe(false);
        expect(elements.root.querySelector('input[data-part="1"]')).toBe(initialInstallment);
        expect(elements.root.querySelector("#financial-payment-preview")?.getAttribute("aria-busy")).toBe("true");
        await vi.advanceTimersByTimeAsync(250);
        expect(elements.root.querySelector("#financial-payment-preview")?.hasAttribute("aria-busy")).toBe(false);

        const firstInstallment = elements.root.querySelector<HTMLInputElement>('input[data-part="1"]')!;
        const originalRow = firstInstallment.closest(".financial-part-row");
        elements.form.scrollTop = 300;
        firstInstallment.checked = true;
        firstInstallment.dispatchEvent(new Event("change", { bubbles: true }));

        expect(elements.root.querySelector('input[data-part="1"]')).toBe(firstInstallment);
        expect(firstInstallment.closest(".financial-part-row")).toBe(originalRow);
        expect(elements.form.scrollTop).toBe(300);
        expect(elements.root.querySelector("#financial-preview-remaining")?.textContent)
            .toBe(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(500));

        manager.dispose();
    });
});

function setInput(selector: string, value: string): void {
    const input = document.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

function installDialogMethods(): void {
    HTMLDialogElement.prototype.showModal = function showModal(): void { this.open = true; };
    HTMLDialogElement.prototype.close = function close(): void {
        this.open = false;
        this.dispatchEvent(new Event("close"));
    };
}

function financialElements(): ClientFinancialElements {
    const value = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
    return {
        root: value(".financial-management-container"),
        clientsIndex: value("#financial-clients-index"),
        clientIndex: value("#financial-client-index"),
        clientName: value("#financial-client-name"),
        titleName: value("#financial-title-name"),
        back: value("#financial-back"),
        paymentsList: value("#financial-payments-list"),
        newPayment: value("#financial-new-payment"),
        feedback: value("#financial-feedback"),
        dialog: value("#financial-payment-dialog"),
        form: value("#financial-payment-form"),
        deleteDialog: value("#financial-delete-dialog"),
        deleteTitle: value("#financial-delete-title"),
        deleteDescription: value("#financial-delete-description"),
        deleteWarning: value("#financial-delete-warning"),
        deleteCountdown: value("#financial-delete-countdown"),
        deleteCancel: value("#financial-delete-cancel"),
        deleteConfirm: value("#financial-delete-confirm")
    };
}

function financialView(): string {
    return `<section class="financial-management-container">
        <a id="financial-clients-index"></a><a id="financial-client-index"></a>
        <span id="financial-client-name"></span><span id="financial-title-name"></span>
        <button id="financial-back"></button><button id="financial-new-payment"></button>
        <p id="financial-feedback"></p><div id="financial-payments-list"></div>
        <dialog id="financial-payment-dialog"><form id="financial-payment-form">
            <h2 id="financial-payment-dialog-title"></h2>
            <input id="financial-payment-title" required>
            <input id="financial-payment-total" type="number" min="0.01" step="0.01" required>
            <input id="financial-payment-count" type="number" min="1" max="120" step="1" required>
            <input id="financial-payment-first-due-date" type="date" required>
            <input id="financial-payment-down" type="number" min="0" max="100">
            <input id="financial-payment-discount" type="number" min="0" max="100">
            <input id="financial-payment-interest" type="number" min="0" max="100">
            <section id="financial-payment-preview" hidden>
                <strong id="financial-preview-final"></strong><strong id="financial-preview-remaining"></strong>
                <div id="financial-installments-editor"></div>
            </section>
            <p id="financial-payment-form-feedback"></p>
            <button id="financial-payment-cancel" type="button"></button>
            <button id="financial-payment-save" type="submit"></button>
        </form></dialog>
        <dialog id="financial-delete-dialog"><h2 id="financial-delete-title"></h2>
            <p id="financial-delete-description"></p><div id="financial-delete-warning"></div>
            <p id="financial-delete-countdown"></p><button id="financial-delete-cancel"></button>
            <button id="financial-delete-confirm"></button>
        </dialog>
    </section>`;
}
