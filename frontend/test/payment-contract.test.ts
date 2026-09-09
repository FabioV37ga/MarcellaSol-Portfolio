import { describe, expect, it } from "vitest";
import {
    parseAdminPayment,
    parseClientPayment,
    parsePaymentPage,
    parsePaymentPreview
} from "../src/shared/financial/payment-contract.js";

const clientPayment = {
    id: "payment-1",
    title: "Projeto",
    totalAmountCents: 10000,
    installmentCount: 1,
    firstDueDate: "2026-09-10",
    downPaymentPercentage: 0,
    discountPercentage: 0,
    interestPercentage: 0,
    discountAmountCents: 0,
    downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-10" },
    finalAmountCents: 10000,
    paidAmountCents: 0,
    remainingAmountCents: 10000,
    installments: [{ number: 1, amountCents: 10000, isPaid: false, dueDate: "2026-10-10" }],
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z"
};

describe("contrato financeiro em runtime", () => {
    it("valida a página do cliente e preserva o destaque global", () => {
        const result = parsePaymentPage({
            payments: [clientPayment],
            page: { limit: 20, hasMore: false },
            summary: { paymentCount: 1, totalAmountCents: 10000, paidAmountCents: 0, remainingAmountCents: 10000 },
            highlight: {
                paymentId: "payment-1",
                paymentTitle: "Projeto",
                partType: "installment",
                installmentNumber: 1,
                label: "Parcela 1",
                amountCents: 10000,
                dueDate: "2026-10-10",
                isPaid: false,
                hasActivePix: false
            }
        }, parseClientPayment);

        expect(result.highlight?.paymentId).toBe("payment-1");
        expect(result.payments[0].installments[0].number).toBe(1);
    });

    it("rejeita respostas parciais que antes passavam por type assertion", () => {
        expect(() => parsePaymentPage({
            payments: [{ ...clientPayment, remainingAmountCents: "10000" }],
            page: { limit: 20, hasMore: false },
            summary: { paymentCount: 1, totalAmountCents: 10000, paidAmountCents: 0, remainingAmountCents: 10000 }
        }, parseClientPayment)).toThrow("contrato financeiro inválido");
    });

    it("exige os campos administrativos ao validar pagamentos do administrador", () => {
        expect(() => parseAdminPayment(clientPayment)).toThrow("contrato financeiro inválido");
        expect(parseAdminPayment({
            ...clientPayment,
            version: 0,
            clientId: "client-1",
            financedAmountCents: 10000,
            interestAmountCents: 0,
            installmentTotalCents: 10000,
            financialTermsLocked: false
        }).version).toBe(0);
    });

    it("rejeita uma prévia financeira estruturalmente inválida", () => {
        expect(() => parsePaymentPreview({
            downPaymentCents: 1000,
            firstDueDate: "2026-09-10",
            installments: [{ amountCents: Number.NaN, dueDate: "2026-10-10" }],
            finalAmountCents: 10000
        })).toThrow("contrato financeiro inválido");
    });
});
