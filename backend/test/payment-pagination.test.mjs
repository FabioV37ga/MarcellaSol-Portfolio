import assert from "node:assert/strict";
import test from "node:test";
import {
    paymentPageOptions,
    paymentPageResponse,
    selectPaymentHighlight
} from "../dist/src/application/financial/payment-pagination.js";

test("cursor financeiro realiza ida e volta sem expor sua estrutura na API", () => {
    const record = {
        _id: { toString: () => "507f1f77bcf86cd799439012" },
        createdAt: new Date("2026-09-10T12:00:00.000Z")
    };
    const response = paymentPageResponse(
        { records: [record], hasMore: true },
        { paymentCount: 2, totalAmountCents: 200, paidAmountCents: 0, remainingAmountCents: 200 },
        undefined,
        1,
        value => value
    );
    const options = paymentPageOptions(response.page.nextCursor, "1");

    assert.equal(options.limit, 1);
    assert.equal(options.cursor.id.toString(), record._id.toString());
    assert.equal(options.cursor.createdAt.toISOString(), record.createdAt.toISOString());
});

test("destaque prioriza vencido sobre candidatos atuais e futuros", () => {
    const candidate = (title, dueDate) => ({
        paymentId: { toString: () => title }, paymentTitle: title,
        partType: "installment", installmentNumber: 1,
        amountCents: 1000, dueDate, isPaid: false
    });
    const highlight = selectPaymentHighlight({
        overdue: candidate("vencido", "2026-09-01"),
        currentUnpaid: candidate("atual", "2026-09-15"),
        nextUnpaid: candidate("futuro", "2026-10-01")
    }, "2026-09-10");

    assert.equal(highlight.paymentId, "vencido");
    assert.equal(highlight.label, "Parcela 1");
});

test("paginação rejeita cursor adulterado e limites excessivos", () => {
    assert.throws(() => paymentPageOptions("cursor-invalido", "20"), /Cursor de paginação inválido/);
    assert.throws(() => paymentPageOptions(undefined, "101"), /limite deve estar entre 1 e 100/);
});
