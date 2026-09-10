import assert from "node:assert/strict";
import test from "node:test";
import {
    clientPaymentResponse,
    hasConfirmedReceiptHistory,
    paymentResponse
} from "../dist/src/application/financial/payment-presenter.js";

const payment = {
    _id: { toString: () => "payment-1" },
    __v: 3,
    clientId: { toString: () => "client-1" },
    title: "Projeto",
    totalAmountCents: 10000,
    installmentCount: 1,
    firstDueDate: "2026-09-10",
    downPaymentPercentage: 20,
    discountPercentage: 0,
    interestPercentage: 0,
    discountAmountCents: 0,
    downPayment: { amountCents: 2000, isPaid: true, dueDate: "2026-09-10", paidAt: new Date(), settlementSource: "manual" },
    financedAmountCents: 8000,
    interestAmountCents: 0,
    installmentTotalCents: 8000,
    finalAmountCents: 10000,
    installments: [{
        number: 1,
        amountCents: 8000,
        isPaid: false,
        dueDate: "2026-10-10",
        pix: { brCode: "secret-br-code", txid: "***", generatedAt: new Date(), expiresAt: new Date("2999-01-01") }
    }],
    events: [],
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-10")
};

test("presenter administrativo inclui controle e totais calculados", () => {
    const response = paymentResponse(payment);
    assert.equal(response.version, 3);
    assert.equal(response.clientId, "client-1");
    assert.equal(response.paidAmountCents, 2000);
    assert.equal(response.remainingAmountCents, 8000);
    assert.equal(response.financialTermsLocked, true);
    assert.equal(hasConfirmedReceiptHistory(payment), true);
});

test("presenter público omite campos internos e segredo do Pix", () => {
    const response = clientPaymentResponse(payment);
    assert.equal(response.clientId, undefined);
    assert.equal(response.version, undefined);
    assert.equal(response.financedAmountCents, undefined);
    assert.equal(response.installments[0].pix.brCode, undefined);
    assert.equal(response.installments[0].pix.analysisWindowEndsAt.toISOString(), "2999-01-01T00:00:00.000Z");
});
