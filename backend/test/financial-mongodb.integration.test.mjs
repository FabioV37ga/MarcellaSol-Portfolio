import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import payments from "../dist/src/models/clientPayment.js";
import financialEvents from "../dist/src/models/financialEvent.js";
import { ClientPaymentRepository } from "../dist/src/repositories/client-payment.repository.js";

const enabled = process.env.RUN_MONGODB_INTEGRATION_TESTS === "1";

test("MongoDB integra cursor, resumo, destaque e concorrência otimista", { skip: !enabled }, async () => {
    const uri = process.env.TEST_DB_CONNECTION_STRING?.trim();
    if (!uri) throw new Error("TEST_DB_CONNECTION_STRING é obrigatória para o teste MongoDB");
    const databaseNameFromUri = decodeURIComponent(uri.split("?")[0].split("/").pop() ?? "");
    if (!/test/i.test(databaseNameFromUri)) {
        throw new Error("Proteção de segurança: o nome do banco em TEST_DB_CONNECTION_STRING deve conter 'test'");
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const actualDatabaseName = mongoose.connection.db?.databaseName ?? "";
    if (!/test/i.test(actualDatabaseName)) {
        await mongoose.disconnect();
        throw new Error("Proteção de segurança: a conexão não apontou para um banco de teste");
    }
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) {
        await mongoose.disconnect();
        throw new Error("O teste de concorrência exige MongoDB configurado como replica set");
    }

    const clientId = new mongoose.Types.ObjectId();
    const repository = new ClientPaymentRepository();
    const base = {
        clientId, totalAmountCents: 10000, installmentCount: 1, firstDueDate: "2026-08-01",
        downPaymentPercentage: 50, discountPercentage: 0, interestPercentage: 0,
        discountAmountCents: 0, downPayment: { amountCents: 5000, isPaid: false, dueDate: "2026-08-01" },
        financedAmountCents: 5000, interestAmountCents: 0, installmentTotalCents: 5000,
        finalAmountCents: 10000, installments: [{ number: 1, amountCents: 5000, isPaid: false, dueDate: "2026-09-01" }],
        events: [], currency: "BRL", timeZone: "America/Sao_Paulo", status: "open", hasReceiptHistory: false
    };

    try {
        const older = await payments.create({ ...base, title: "Antigo vencido", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") });
        await payments.create({ ...base, title: "Novo", downPayment: { ...base.downPayment, isPaid: true },
            installments: [{ ...base.installments[0], isPaid: true }], status: "paid",
            createdAt: new Date("2026-02-01"), updatedAt: new Date("2026-02-01") });

        const first = await repository.findPageByClientId(clientId.toString(), { limit: 1 });
        assert.equal(first.records.length, 1);
        assert.equal(first.hasMore, true);
        const second = await repository.findPageByClientId(clientId.toString(), {
            limit: 1, cursor: { createdAt: first.records[0].createdAt, id: first.records[0]._id }
        });
        assert.equal(second.records[0]._id.toString(), older._id.toString());

        const summary = await repository.summarizeByClientId(clientId.toString());
        assert.deepEqual(summary, { paymentCount: 2, totalAmountCents: 20000, paidAmountCents: 10000, remainingAmountCents: 10000 });
        const highlight = await repository.findHighlightCandidatesByClientId(
            clientId.toString(), "2026-09-08", "2026-09-01", "2026-10-01"
        );
        assert.equal(highlight.overdue?.paymentId.toString(), older._id.toString());

        const event = occurrence => ({ eventId: randomUUID(), type: "manual-status-change", actorId: "integration-test",
            actorSessionId: randomUUID(), actorRole: "admin", occurredAt: occurrence, partType: "down-payment", isPaid: true,
            receiptId: randomUUID() });
        const results = await Promise.all([
            repository.setDownPaymentPaid(older._id.toString(), clientId.toString(), 0, true, event(new Date()), "partially-paid"),
            repository.setDownPaymentPaid(older._id.toString(), clientId.toString(), 0, true, event(new Date()), "partially-paid")
        ]);
        assert.equal(results.filter(Boolean).length, 1);
        assert.equal(await financialEvents.countDocuments({ clientId, paymentId: older._id, type: "receipt-confirmed" }), 1);
    } finally {
        await financialEvents.deleteMany({ clientId });
        await payments.deleteMany({ clientId });
        await mongoose.disconnect();
    }
});
