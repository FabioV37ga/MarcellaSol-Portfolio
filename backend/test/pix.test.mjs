import assert from "node:assert/strict";
import test from "node:test";
import { crc16, generatePixBrCode } from "../dist/src/services/pix-br-code.js";
import { ClientPaymentService } from "../dist/src/application/client-payment.service.js";

const TEST_PIX_RECEIVER = { key: "test@example.com", name: "TEST RECEIVER", city: "SAO PAULO" };

test("BR Code Pix inclui chave, valor exato e CRC válido", () => {
    const payload = generatePixBrCode(12345, "abc123", TEST_PIX_RECEIVER);
    assert.match(payload, /test@example\.com/);
    assert.match(payload, /5406123\.45/);
    assert.equal(payload.slice(-4), crc16(payload.slice(0, -4)));
});

test("Pix da parcela usa seu valor e abre uma janela de análise por cinco horas", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const existing = {
        _id: { toString: () => paymentId }, __v: 0, clientId: { toString: () => clientId }, title: "Projeto",
        totalAmountCents: 24690, installmentCount: 1, firstDueDate: "2026-09-03", downPaymentPercentage: 0,
        discountPercentage: 0, interestPercentage: 0, discountAmountCents: 0,
        downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-03" }, financedAmountCents: 24690,
        interestAmountCents: 0, installmentTotalCents: 24690, finalAmountCents: 24690,
        installments: [{ number: 1, amountCents: 24690, isPaid: false, dueDate: "2026-10-03" }],
        events: [], createdAt: new Date(), updatedAt: new Date()
    };
    let persisted;
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async findByIdAndClientId() { return existing; },
            async setInstallmentPix(_id, _clientId, _version, number, pix, event) {
                persisted = { number, pix, event };
                return { ...existing, __v: 1, installments: [{ ...existing.installments[0], pix }] };
            }
        }
    );
    const before = Date.now();
    const result = await service.generatePix(clientId, paymentId, "installment", 1, { id: clientId, sessionId: "session-1", role: "client" });
    assert.equal(result.pix.amountCents, 24690);
    assert.match(result.pix.brCode, /5406246\.90/);
    assert.match(result.pix.brCode, /test@example\.com/);
    assert.match(result.pix.qrCodeDataUrl, /^data:image\/png;base64,/);
    assert.equal(persisted.event.type, "pix-code-generated");
    assert.equal(persisted.event.actorRole, "client");
    assert.ok(persisted.pix.analysisWindowEndsAt.getTime() - before >= 5 * 60 * 60 * 1000 - 1000);
    assert.ok(persisted.pix.analysisWindowEndsAt.getTime() - before <= 5 * 60 * 60 * 1000 + 1000);
    assert.equal(persisted.pix.expiresAt, undefined);
    assert.equal(persisted.event.pixAnalysisWindowEndsAt, persisted.pix.analysisWindowEndsAt);
    assert.equal(result.pix.analysisWindowEndsAt, persisted.pix.analysisWindowEndsAt);
    assert.equal(result.pix.expiresAt, undefined);
});

test("tentativa Pix legada é lida e exposta com a nova janela de análise", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const legacyWindowEnd = new Date(Date.now() + 60 * 60 * 1000);
    const legacyPix = {
        txid: "legacy123",
        brCode: generatePixBrCode(24690, "legacy123", TEST_PIX_RECEIVER),
        generatedAt: new Date(),
        expiresAt: legacyWindowEnd
    };
    const existing = {
        _id: { toString: () => paymentId }, __v: 0, clientId: { toString: () => clientId }, title: "Projeto",
        totalAmountCents: 24690, installmentCount: 1, firstDueDate: "2026-09-03", downPaymentPercentage: 0,
        discountPercentage: 0, interestPercentage: 0, discountAmountCents: 0,
        downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-03" }, financedAmountCents: 24690,
        interestAmountCents: 0, installmentTotalCents: 24690, finalAmountCents: 24690,
        installments: [{ number: 1, amountCents: 24690, isPaid: false, dueDate: "2026-10-03", pix: legacyPix }],
        events: [], createdAt: new Date(), updatedAt: new Date()
    };
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async findByIdAndClientId() { return existing; },
            async setInstallmentPix() { throw new Error("A tentativa ativa não deve ser substituída"); }
        }
    );

    const result = await service.generatePix(
        clientId,
        paymentId,
        "installment",
        1,
        { id: clientId, sessionId: "session-1", role: "client" }
    );

    assert.equal(result.pix.analysisWindowEndsAt, legacyWindowEnd);
    assert.equal(result.pix.expiresAt, undefined);
    assert.equal(result.payment.installments[0].pix.analysisWindowEndsAt, legacyWindowEnd);
    assert.equal(result.payment.installments[0].pix.expiresAt, undefined);
});
