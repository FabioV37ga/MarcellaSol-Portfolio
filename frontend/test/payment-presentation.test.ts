import { describe, expect, it } from "vitest";
import type { ClientPayment } from "../src/client/infrastructure/client-system.api.js";
import {
    dueDateLabel,
    paymentHasActivePix,
    paymentHasOverduePart,
    paymentPartStatus,
    selectHighlightedPaymentPart,
    type FinancialClock
} from "../src/shared/financial/payment-presentation.js";

const clock: FinancialClock = () => new Date(2026, 8, 6, 12);

describe("apresentação financeira", () => {
    it("classifica prazos com um relógio injetado", () => {
        expect(paymentPartStatus("2026-09-05", false, undefined, clock)).toMatchObject({
            kind: "overdue",
            timeLabel: "Vencida há 1 dia"
        });
        expect(paymentPartStatus("2026-09-06", false, undefined, clock)).toMatchObject({
            kind: "pending",
            timeLabel: "Vence hoje"
        });
        expect(dueDateLabel("2026-09-08", false, clock)).toBe("Faltam 2 dias");
    });

    it("prioriza pagamento confirmado e depois a janela Pix ativa", () => {
        const pix = { expiresAt: new Date(clock().getTime() + 60 * 60 * 1000).toISOString() };
        expect(paymentPartStatus("2026-09-01", true, pix, clock).kind).toBe("paid");
        expect(paymentPartStatus("2026-09-01", false, pix, clock).kind).toBe("analysis");
    });

    it("não marca como atrasada uma parcela com janela Pix ativa", () => {
        const expiresAt = new Date(clock().getTime() + 60 * 60 * 1000).toISOString();
        const payment = createPayment([
            { number: 1, amountCents: 5000, isPaid: false, dueDate: "2026-09-01", pix: { expiresAt } }
        ]);

        expect(paymentHasActivePix(payment, clock)).toBe(true);
        expect(paymentHasOverduePart(payment, clock)).toBe(false);
    });

    it("seleciona primeiro o vencimento atrasado e limita antecipação a 28 dias", () => {
        const overdue = createPayment([
            { number: 1, amountCents: 5000, isPaid: false, dueDate: "2026-09-05" },
            { number: 2, amountCents: 5000, isPaid: false, dueDate: "2026-09-20" }
        ]);
        expect(selectHighlightedPaymentPart([overdue], clock)?.installmentNumber).toBe(1);

        const future = createPayment([
            { number: 1, amountCents: 5000, isPaid: true, dueDate: "2026-09-01" },
            { number: 2, amountCents: 5000, isPaid: false, dueDate: "2026-10-05" }
        ]);
        expect(selectHighlightedPaymentPart([future], clock)?.installmentNumber).toBe(1);
    });
});

function createPayment(installments: ClientPayment["installments"]): ClientPayment {
    return {
        id: "payment-1",
        title: "Projeto",
        totalAmountCents: 10000,
        installmentCount: installments.length,
        firstDueDate: "2026-08-01",
        downPaymentPercentage: 0,
        discountPercentage: 0,
        interestPercentage: 0,
        discountAmountCents: 0,
        downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-08-01" },
        finalAmountCents: 10000,
        paidAmountCents: installments.filter(item => item.isPaid).reduce((sum, item) => sum + item.amountCents, 0),
        remainingAmountCents: installments.filter(item => !item.isPaid).reduce((sum, item) => sum + item.amountCents, 0),
        installments,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z"
    };
}
