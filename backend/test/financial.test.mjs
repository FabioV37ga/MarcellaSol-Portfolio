import assert from "node:assert/strict";
import test from "node:test";
import { calculatePaymentSchedule, ClientPaymentService, monthlyDueDate } from "../dist/src/application/client-payment.service.js";
import { chargePartStatus, chargeStatus, FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../dist/src/domain/financial-domain.js";
import ClientPayment from "../dist/src/models/clientPayment.js";

const TEST_PIX_RECEIVER = { key: "test@example.com", name: "TEST RECEIVER", city: "SAO PAULO" };

test("domínio financeiro possui moeda, fuso e estados explícitos", () => {
    assert.equal(FINANCIAL_CURRENCY, "BRL");
    assert.equal(FINANCIAL_TIME_ZONE, "America/Sao_Paulo");
    assert.equal(chargePartStatus({ amountCents: 1000, isPaid: false }), "pending");
    assert.equal(chargeStatus([{ amountCents: 1000, isPaid: false }]), "open");
    assert.equal(chargeStatus([
        { amountCents: 1000, isPaid: true },
        { amountCents: 1000, isPaid: false }
    ]), "partially-paid");
    assert.equal(chargeStatus([{ amountCents: 1000, isPaid: true }]), "paid");
    assert.equal(chargeStatus([{ amountCents: 1000, isPaid: true }], new Date()), "cancelled");
});

test("confirmação manual cria recibo e reversão compensatória sem mudar o contrato visual", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const calls = [];
    const existing = {
        _id: { toString: () => paymentId }, __v: 0,
        clientId: { toString: () => clientId }, title: "Projeto",
        totalAmountCents: 10000, installmentCount: 1, firstDueDate: "2026-09-03",
        downPaymentPercentage: 0, discountPercentage: 0, interestPercentage: 0,
        discountAmountCents: 0, downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-03" },
        financedAmountCents: 10000, interestAmountCents: 0, installmentTotalCents: 10000,
        finalAmountCents: 10000,
        installments: [{ number: 1, amountCents: 10000, isPaid: false, dueDate: "2026-10-03" }],
        events: [], createdAt: new Date(), updatedAt: new Date()
    };
    const repository = {
        async findByIdAndClientId() { return existing; },
        async setInstallmentPaid(_id, _clientId, version, number, isPaid, event, status) {
            calls.push({ version, number, isPaid, event, status });
            existing.__v += 1;
            existing.installments[0] = {
                ...existing.installments[0], isPaid,
                ...(isPaid ? { settlementReceiptId: event.receiptId } : {})
            };
            existing.status = status;
            return existing;
        }
    };
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        repository
    );
    const actor = { id: "admin-1", sessionId: "session-1", role: "admin" };

    const paid = await service.setInstallmentPaid(clientId, paymentId, 1, true, 0, actor);
    assert.equal(paid.installments[0].isPaid, true);
    assert.equal(paid.status, "paid");
    assert.match(calls[0].event.receiptId, /^[0-9a-f-]{36}$/);

    const receiptId = calls[0].event.receiptId;
    const reversed = await service.setInstallmentPaid(clientId, paymentId, 1, false, 1, actor);
    assert.equal(reversed.installments[0].isPaid, false);
    assert.equal(reversed.status, "open");
    assert.equal(calls[1].event.reversesReceiptId, receiptId);
    assert.equal(calls[1].event.receiptId, undefined);
});

test("resposta de criação serializa subdocumentos Mongoose sem expor o recibo interno", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async create(data) {
                return new ClientPayment({ _id: "507f1f77bcf86cd799439012", ...data });
            }
        }
    );
    const response = await service.create(clientId, {
        title: "Projeto",
        totalAmount: "100.00",
        installmentCount: 1,
        firstDueDate: "2026-09-03"
    }, { id: "admin-1", sessionId: "session-1", role: "admin" });

    assert.doesNotThrow(() => JSON.stringify(response));
    assert.equal(response.installments[0].settlementReceiptId, undefined);
    assert.equal(response.currency, "BRL");
    assert.equal(response.timeZone, "America/Sao_Paulo");
});

test("cálculo financeiro distribui centavos sem perder valor", () => {
    const schedule = calculatePaymentSchedule({
        totalAmount: "1000.00",
        installmentCount: 3,
        firstDueDate: "2026-08-18",
        downPaymentPercentage: "10",
        discountPercentage: "5",
        interestPercentage: "12"
    });

    assert.equal(schedule.discountAmountCents, 5000);
    assert.equal(schedule.downPayment.amountCents, 9500);
    assert.equal(schedule.financedAmountCents, 85500);
    assert.equal(schedule.interestAmountCents, 10260);
    assert.equal(schedule.finalAmountCents, 105260);
    assert.deepEqual(schedule.installments.map(item => item.amountCents), [31920, 31920, 31920]);
    assert.equal(schedule.downPayment.dueDate, "2026-08-18");
    assert.deepEqual(schedule.installments.map(item => item.dueDate), ["2026-09-18", "2026-10-18", "2026-11-18"]);
    assert.equal(
        schedule.downPayment.amountCents + schedule.installments.reduce((sum, item) => sum + item.amountCents, 0),
        schedule.finalAmountCents
    );
});

test("prévia financeira usa o mesmo cálculo oficial do pagamento", () => {
    const service = new ClientPaymentService(TEST_PIX_RECEIVER);
    const preview = service.preview({
        totalAmount: "1000.00",
        installmentCount: 3,
        firstDueDate: "2026-01-31",
        downPaymentPercentage: "10",
        discountPercentage: "5",
        interestPercentage: "12"
    });

    assert.deepEqual(preview, {
        downPaymentCents: 9500,
        firstDueDate: "2026-01-31",
        installments: [
            { amountCents: 31920, dueDate: "2026-02-28" },
            { amountCents: 31920, dueDate: "2026-03-31" },
            { amountCents: 31920, dueDate: "2026-04-30" }
        ],
        finalAmountCents: 105260
    });
});

test("edição financeira preserva ou substitui os estados pagos explicitamente", () => {
    const previous = {
        downPayment: { amountCents: 1000, isPaid: true },
        installments: [
            { number: 1, amountCents: 3000, isPaid: true },
            { number: 2, amountCents: 3000, isPaid: false }
        ]
    };
    const preserved = calculatePaymentSchedule({ totalAmount: 100, installmentCount: 2, firstDueDate: "2026-08-18", downPaymentPercentage: 10 }, previous);
    assert.equal(preserved.downPayment.isPaid, true);
    assert.equal(preserved.downPayment.paidAt, undefined);
    assert.deepEqual(preserved.installments.map(item => item.isPaid), [true, false]);

    const replaced = calculatePaymentSchedule({
        totalAmount: 100,
        installmentCount: 2,
        firstDueDate: "2026-08-18",
        downPaymentPercentage: 10,
        downPaymentIsPaid: false,
        paidInstallmentNumbers: [2]
    }, previous);
    assert.equal(replaced.downPayment.isPaid, false);
    assert.deepEqual(replaced.installments.map(item => item.isPaid), [false, true]);
    assert.ok(replaced.installments[1].paidAt instanceof Date);
});

test("vencimentos mensais preservam o dia e usam o último dia quando necessário", () => {
    assert.equal(monthlyDueDate("2026-01-31", 1), "2026-02-28");
    assert.equal(monthlyDueDate("2026-01-31", 2), "2026-03-31");
});

test("consulta financeira usa exclusivamente o cliente recebido da sessão", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const queriedIds = [];
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById(id) { assert.equal(id, clientId); return { _id: id }; } },
        {
            async findByClientId(id) {
                queriedIds.push(id);
                return [{
                    _id: { toString: () => "507f1f77bcf86cd799439012" },
                    clientId: { toString: () => clientId },
                    title: "Projeto completo",
                    totalAmountCents: 100000,
                    installmentCount: 2,
                    downPaymentPercentage: 10,
                    discountPercentage: 0,
                    interestPercentage: 0,
                    discountAmountCents: 0,
                    downPayment: { amountCents: 10000, isPaid: true },
                    financedAmountCents: 90000,
                    interestAmountCents: 0,
                    installmentTotalCents: 90000,
                    finalAmountCents: 100000,
                    installments: [
                        { number: 1, amountCents: 45000, isPaid: true },
                        { number: 2, amountCents: 45000, isPaid: false }
                    ],
                    createdAt: new Date(),
                    updatedAt: new Date()
                }];
            }
        }
    );

    const result = await service.list(clientId);
    assert.deepEqual(queriedIds, [clientId]);
    assert.equal(result.payments[0].paidAmountCents, 55000);
    assert.equal(result.payments[0].remainingAmountCents, 45000);
    assert.equal(result.summary.paidAmountCents, 55000);
});

test("resposta financeira do cliente omite identificadores e cálculos internos", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        { async findByClientId() { return [{
            _id: { toString: () => "507f1f77bcf86cd799439012" },
            __v: 4,
            clientId: { toString: () => clientId },
            title: "Projeto",
            totalAmountCents: 10000,
            installmentCount: 1,
            firstDueDate: "2026-09-03",
            downPaymentPercentage: 0,
            discountPercentage: 0,
            interestPercentage: 0,
            discountAmountCents: 0,
            downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-03" },
            financedAmountCents: 10000,
            interestAmountCents: 0,
            installmentTotalCents: 10000,
            finalAmountCents: 10000,
            installments: [{ number: 1, amountCents: 10000, isPaid: false, dueDate: "2026-10-03" }],
            createdAt: new Date(),
            updatedAt: new Date()
        }]; } }
    );

    const { payments: [payment] } = await service.listForClient(clientId);
    assert.equal(payment.clientId, undefined);
    assert.equal(payment.version, undefined);
    assert.equal(payment.financedAmountCents, undefined);
});

test("listagem financeira devolve paginação explícita e resumo independente da página", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const createdAt = new Date("2026-09-08T12:00:00.000Z");
    const record = {
        _id: { toString: () => "507f1f77bcf86cd799439012" }, clientId: { toString: () => clientId },
        title: "Primeira página", totalAmountCents: 10000, installmentCount: 1,
        firstDueDate: "2026-09-08", downPaymentPercentage: 0, discountPercentage: 0,
        interestPercentage: 0, discountAmountCents: 0,
        downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-08" },
        financedAmountCents: 10000, interestAmountCents: 0, installmentTotalCents: 10000,
        finalAmountCents: 10000, installments: [{ number: 1, amountCents: 10000, isPaid: false, dueDate: "2026-10-08" }],
        createdAt, updatedAt: createdAt
    };
    const service = new ClientPaymentService(TEST_PIX_RECEIVER, { async findById() { return { _id: clientId }; } }, {
        async findPageByClientId(id, options) {
            assert.equal(id, clientId);
            assert.equal(options.limit, 1);
            return { records: [record], hasMore: true };
        },
        async summarizeByClientId() {
            return { paymentCount: 12, totalAmountCents: 120000, paidAmountCents: 40000, remainingAmountCents: 80000 };
        },
        async findHighlightCandidatesByClientId() {
            return { overdue: {
                paymentId: { toString: () => "507f1f77bcf86cd799439099" },
                paymentTitle: "Pagamento fora da primeira página", partType: "installment",
                installmentNumber: 3, amountCents: 25000, dueDate: "2020-01-01", isPaid: false
            } };
        }
    });
    const result = await service.list(clientId, undefined, "1");
    assert.equal(result.payments.length, 1);
    assert.equal(result.page.hasMore, true);
    assert.ok(result.page.nextCursor);
    assert.equal(result.summary.paymentCount, 12);
    assert.equal(result.highlight.paymentId, "507f1f77bcf86cd799439099");
    assert.equal(result.highlight.label, "Parcela 3");
});

test("listagem financeira rejeita cursor inválido", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const service = new ClientPaymentService(TEST_PIX_RECEIVER, { async findById() { return { _id: clientId }; } }, {});
    await assert.rejects(() => service.list(clientId, "cursor-invalido"), /Cursor de paginação inválido/);
});

test("edição financeira exige versão atual e registra auditoria", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const existing = {
        _id: { toString: () => paymentId },
        __v: 2,
        clientId: { toString: () => clientId },
        title: "Projeto original",
        totalAmountCents: 10000,
        installmentCount: 1,
        firstDueDate: "2026-09-03",
        downPaymentPercentage: 0,
        discountPercentage: 0,
        interestPercentage: 0,
        discountAmountCents: 0,
        downPayment: { amountCents: 0, isPaid: false, dueDate: "2026-09-03" },
        financedAmountCents: 10000,
        interestAmountCents: 0,
        installmentTotalCents: 10000,
        finalAmountCents: 10000,
        installments: [{
            number: 1,
            amountCents: 10000,
            isPaid: true,
            dueDate: "2026-10-03",
            paidAt: new Date("2026-10-03T12:00:00.000Z"),
            settlementSource: "manual"
        }],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const updates = [];
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async findByIdAndClientId() { return existing; },
            async update(id, ownerId, version, data, event) {
                updates.push({ id, ownerId, version, data, event });
                return { ...existing, ...data, __v: version + 1 };
            }
        }
    );
    const fields = {
        title: "Projeto revisado",
        totalAmount: "100.00",
        installmentCount: 1,
        firstDueDate: "2026-09-03",
        paidInstallmentNumbers: [],
        version: 2
    };
    const actor = { id: "admin-1", sessionId: "session-1", role: "admin" };

    const updated = await service.edit(clientId, paymentId, fields, actor);
    assert.equal(updated.version, 3);
    assert.equal(updates[0].version, 2);
    assert.equal(updates[0].event.type, "terms-updated");
    assert.equal(updates[0].event.actorId, "admin-1");
    assert.equal(updates[0].data.installments[0].isPaid, true);
    assert.equal(updates[0].data.installments[0].amountCents, 10000);

    const forbiddenChanges = [
        { totalAmount: "120.00" },
        { installmentCount: 2 },
        { firstDueDate: "2026-09-04" },
        { downPaymentPercentage: 10 },
        { discountPercentage: 10 },
        { interestPercentage: 10 }
    ];
    for (const change of forbiddenChanges) {
        await assert.rejects(
            () => service.edit(clientId, paymentId, { ...fields, ...change }, actor),
            error => error.status === 409 && /condições financeiras/.test(error.message)
        );
    }

    existing.installments[0].isPaid = false;
    existing.events = [{ type: "manual-status-change", isPaid: true }];
    await assert.rejects(
        () => service.edit(clientId, paymentId, { ...fields, totalAmount: "120.00" }, actor),
        error => error.status === 409 && /condições financeiras/.test(error.message)
    );

    await assert.rejects(
        () => service.edit(clientId, paymentId, { ...fields, version: 1 }, actor),
        error => error.status === 409
    );
    assert.equal(updates.length, 1);
});

test("remoção financeira arquiva a cobrança e registra o administrador", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const archived = [];
    const existing = {
        _id: paymentId,
        __v: 3,
        downPayment: { amountCents: 0, isPaid: false },
        installments: [{ number: 1, amountCents: 10000, isPaid: false }],
        events: []
    };
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async findByIdAndClientId() { return existing; },
            async archive(id, ownerId, version, event) {
                archived.push({ id, ownerId, version, event });
                return { ...existing, archivedAt: event.occurredAt };
            }
        }
    );

    await service.remove(clientId, paymentId, 3, false, {
        id: "admin-1",
        sessionId: "session-1",
        role: "admin"
    });

    assert.equal(archived.length, 1);
    assert.equal(archived[0].id, paymentId);
    assert.equal(archived[0].ownerId, clientId);
    assert.equal(archived[0].version, 3);
    assert.equal(archived[0].event.type, "archived");
    assert.equal(archived[0].event.actorId, "admin-1");
    assert.equal(archived[0].event.hadConfirmedReceiptHistory, false);
});

test("remoção com histórico confirmado exige confirmação reforçada", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const paymentId = "507f1f77bcf86cd799439012";
    const archived = [];
    const existing = {
        _id: paymentId,
        __v: 1,
        downPayment: { amountCents: 0, isPaid: false },
        installments: [{ number: 1, amountCents: 10000, isPaid: false }],
        events: [{ type: "manual-status-change", isPaid: true }]
    };
    const service = new ClientPaymentService(
        TEST_PIX_RECEIVER,
        { async findById() { return { _id: clientId }; } },
        {
            async findByIdAndClientId() { return existing; },
            async archive(_id, _ownerId, _version, event) {
                archived.push(event);
                return existing;
            }
        }
    );
    const actor = { id: "admin-1", sessionId: "session-1", role: "admin" };

    await assert.rejects(
        () => service.remove(clientId, paymentId, 1, false, actor),
        error => error.status === 409 && /Confirme explicitamente/.test(error.message)
    );
    assert.equal(archived.length, 0);

    await service.remove(clientId, paymentId, 1, true, actor);
    assert.equal(archived.length, 1);
    assert.equal(archived[0].hadConfirmedReceiptHistory, true);

    await assert.rejects(
        () => service.remove(clientId, paymentId, 0, true, actor),
        error => error.status === 409
    );
    assert.equal(archived.length, 1);
});
