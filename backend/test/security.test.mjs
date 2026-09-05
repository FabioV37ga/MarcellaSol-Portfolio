import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { loginCredentials } from "../dist/src/controllers/login-credentials.js";
import { errorHandler } from "../dist/src/middleware/error-handler.middleware.js";
import { adminLoginRateLimit } from "../dist/src/middleware/login-rate-limit.middleware.js";
import { securityHeaders } from "../dist/src/middleware/security-headers.middleware.js";
import { SessionService } from "../dist/src/services/session.service.js";
import { SessionTokenService } from "../dist/src/services/session-token.service.js";
import { ClientProposalService } from "../dist/src/application/client-proposal.service.js";
import {
    hasConfiguredProjectStageOrder,
    initialProjectStages,
    normalizedProjectStages,
    projectStagesAfterBriefingSubmission,
    projectStagesForProposal
} from "../dist/src/models/projectStage.js";
import { BriefingFolderAccessService } from "../dist/src/application/briefing-folder-access.service.js";
import { extractResidentEmails } from "../dist/src/services/briefing-emails.js";
import { UpdateClientProjectStageService } from "../dist/src/application/update-client-project-stage.service.js";
import { DeleteClientService } from "../dist/src/application/delete-client.service.js";
import { ListClientsService } from "../dist/src/application/list-clients.service.js";
import { calculatePaymentSchedule, ClientPaymentService, monthlyDueDate } from "../dist/src/application/client-payment.service.js";

process.env.AUTH_TOKEN_SECRET = "test-only-session-secret-with-at-least-32-characters";
const TEST_PIX_RECEIVER = { key: "test@example.com", name: "TEST RECEIVER", city: "SAO PAULO" };

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
    assert.equal(result[0].paidAmountCents, 55000);
    assert.equal(result[0].remainingAmountCents, 45000);
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

    const [payment] = await service.listForClient(clientId);
    assert.equal(payment.clientId, undefined);
    assert.equal(payment.version, undefined);
    assert.equal(payment.financedAmountCents, undefined);
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

test("sessões administrativas expiram antes das sessões de cliente", () => {
    const tokens = new SessionTokenService();
    const now = Math.floor(Date.now() / 1000);
    const admin = tokens.issue({ subject: "admin", role: "admin", login: "admin", name: "Admin" });
    const client = tokens.issue({ subject: "client", role: "client", login: "client", name: "Client" });

    assert.ok(admin.expiresAt - now <= 8 * 60 * 60);
    assert.ok(client.expiresAt - now >= 7 * 24 * 60 * 60 - 1);
});

class MemorySessionStore {
    records = new Map();

    async create(session) {
        this.records.set(session.sessionId, { ...session, revoked: false });
    }

    async isActive(principal) {
        const session = this.records.get(principal.sessionId);
        return Boolean(session && !session.revoked && session.subject === principal.subject
            && session.role === principal.role && session.expiresAt.getTime() > Date.now());
    }

    async revoke(principal) {
        const session = this.records.get(principal.sessionId);
        if (session) session.revoked = true;
    }
}

async function listen(app) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Endereço de teste indisponível");
    return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function close(server) {
    server.close();
    await once(server, "close");
}

test("sessão emitida é aceita e deixa de ser aceita após revogação", async () => {
    const store = new MemorySessionStore();
    const sessions = new SessionService(new SessionTokenService(), store);
    const token = await sessions.issue({
        subject: "507f1f77bcf86cd799439011",
        role: "client",
        login: "cliente-teste",
        name: "Cliente Teste"
    });

    const principal = await sessions.authenticate(token);
    assert.equal(principal?.subject, "507f1f77bcf86cd799439011");
    assert.equal(principal?.role, "client");

    await sessions.revoke(principal);
    assert.equal(await sessions.authenticate(token), undefined);
});

test("token adulterado ou com segmento extra é rejeitado", async () => {
    const store = new MemorySessionStore();
    const sessions = new SessionService(new SessionTokenService(), store);
    const token = await sessions.issue({
        subject: "507f1f77bcf86cd799439012",
        role: "admin",
        login: "admin-teste",
        name: "Admin Teste"
    });

    assert.equal(await sessions.authenticate(`${token}a`), undefined);
    assert.equal(await sessions.authenticate(`${token}.extra`), undefined);
});

test("credenciais rejeitam objetos NoSQL e preservam a senha sem trim", () => {
    assert.throws(() => loginCredentials({ login: { $ne: null }, password: "segredo" }));
    assert.deepEqual(loginCredentials({ login: " usuario ", password: " senha " }), {
        login: "usuario",
        password: " senha "
    });
});

test("erros de JSON retornam mensagem segura e headers defensivos", async () => {
    const app = express();
    app.disable("x-powered-by");
    app.use(...securityHeaders(false));
    app.use(express.json());
    app.post("/json", (_request, response) => response.json({ ok: true }));
    app.use(errorHandler);
    const { server, baseUrl } = await listen(app);

    try {
        const response = await fetch(`${baseUrl}/json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{"
        });
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { message: "JSON inválido." });
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("x-frame-options"), "DENY");
        assert.equal(response.headers.get("x-powered-by"), null);
        assert.ok(response.headers.get("content-security-policy"));
    } finally {
        await close(server);
    }
});

test("login administrativo bloqueia a sexta falha e envia Retry-After", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", adminLoginRateLimit, (_request, response) => {
        response.status(401).json({ message: "Login ou senha incorretos" });
    });
    const { server, baseUrl } = await listen(app);

    try {
        const statuses = [];
        let blockedResponse;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const response = await fetch(`${baseUrl}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login: "inexistente", password: "inválida" })
            });
            statuses.push(response.status);
            if (attempt === 5) blockedResponse = response;
        }

        assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
        assert.ok(blockedResponse?.headers.get("retry-after"));
        assert.ok(blockedResponse?.headers.get("ratelimit"));
    } finally {
        await close(server);
    }
});

test("cliente aprova apenas proposta pendente vinculada à sua sessão", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const calls = [];
    const stageUpdates = [];
    const repository = {
        async decide(id, ownerId, status, userComment) {
            calls.push({ id, ownerId, status, userComment });
            return { _id: id, userId: ownerId, stageKey: "survey", status, userComment };
        },
        async findByIdAndUserId() {
            return { _id: proposalId, stageKey: "survey", status: "sent", userComment: "" };
        }
    };
    const clients = {
        async findById() {
            return {
                _id: userId,
                hasFilledBriefing: true,
                currentStageKey: "briefing",
                projectStages: [
                    { key: "briefing", status: "awaiting-approval" },
                    { key: "survey", status: "awaiting-approval" }
                ]
            };
        },
        async updateProjectStageState(id, currentStageKey, projectStages) {
            stageUpdates.push({ id, currentStageKey, projectStages });
            return { _id: id };
        }
    };
    const service = new ClientProposalService(clients, repository, {});

    await assert.rejects(
        () => service.approve(userId, proposalId, "   "),
        error => error.status === 400
    );
    const result = await service.approve(userId, proposalId, "Aprovado conforme apresentado");
    assert.equal(result.proposal.status, "approved");
    assert.equal(result.proposal.userComment, "Aprovado conforme apresentado");
    assert.deepEqual(calls, [{
        id: proposalId,
        ownerId: userId,
        status: "approved",
        userComment: "Aprovado conforme apresentado"
    }]);
    assert.equal(result.currentStageKey, "survey");
    assert.equal(result.projectStages.find(stage => stage.key === "briefing")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "layout")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "project-development")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "approved");
    assert.equal(stageUpdates.length, 1);
});

test("solicitação de alteração exige comentário e recusa proposta já decidida", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const repository = {
        async decide() { return null; },
        async findByIdAndUserId() { return { _id: proposalId, status: "approved" }; }
    };
    const service = new ClientProposalService({}, repository, {});

    await assert.rejects(() => service.beat(userId, proposalId, "   ", true), error => error.status === 400);
    await assert.rejects(
        () => service.beat(userId, proposalId, "Precisa de ajustes", false),
        error => error.status === 400
    );
    await assert.rejects(
        () => service.beat(userId, proposalId, "Precisa de ajustes", true),
        error => error.status === 409
    );
});

test("criação de proposta avança o cliente e conclui todas as etapas anteriores", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const stageUpdates = [];
    const proposalRepository = {
        async create(data) { return data; },
        async delete() { return null; }
    };
    const clients = {
        async findById() {
            return {
                _id: userId,
                driveFolderId: "pasta-cliente",
                hasFilledBriefing: true,
                currentStageKey: "briefing",
                projectStages: [
                    { key: "briefing", status: "approved" },
                    { key: "survey", status: "in-progress" },
                    { key: "layout", status: "not-started" }
                ]
            };
        },
        async updateProjectStageState(id, currentStageKey, projectStages) {
            stageUpdates.push({ id, currentStageKey, projectStages });
            return { _id: id };
        }
    };
    const storage = {
        async uploadProposal() {
            return {
                folderId: "pasta-proposta",
                attachmentUrls: ["https://drive.google.com/file/d/arquivo-1/view"]
            };
        },
        async setProposalFolderTrashed() {}
    };
    const service = new ClientProposalService(clients, proposalRepository, storage);

    const result = await service.create(
        userId,
        { title: "Levantamento v1", description: "Primeira versão", stageKey: "survey" },
        [{ originalname: "levantamento.pdf" }]
    );

    assert.equal(result.proposal.status, "sent");
    assert.equal(result.currentStageKey, "survey");
    assert.deepEqual(result.projectStages.slice(0, 5), [
        { key: "contract", status: "completed" },
        { key: "briefing", status: "completed" },
        { key: "layout", status: "completed" },
        { key: "project-development", status: "completed" },
        { key: "survey", status: "awaiting-approval" }
    ]);
    assert.equal(stageUpdates.length, 1);
});

test("cliente que solicita alteração coloca a etapa em alterações solicitadas", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const clients = {
        async findById() {
            return {
                _id: userId,
                hasFilledBriefing: true,
                currentStageKey: "survey",
                projectStages: [
                    { key: "briefing", status: "completed" },
                    { key: "survey", status: "awaiting-approval" }
                ]
            };
        },
        async updateProjectStageState() { return { _id: userId }; }
    };
    const proposals = {
        async findByIdAndUserId() {
            return { _id: proposalId, stageKey: "survey", status: "sent", userComment: "" };
        },
        async decide(_id, _userId, status, userComment) {
            return { _id: proposalId, stageKey: "survey", status, userComment };
        }
    };
    const service = new ClientProposalService(clients, proposals, {});

    const result = await service.beat(userId, proposalId, "Ajustar a bancada", true);

    assert.equal(result.proposal.status, "beated");
    assert.equal(result.proposal.userComment, "Ajustar a bancada");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "changes-requested");
});

test("reenvio de proposta devolve a etapa para aguardando aprovação", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const clients = {
        async findById() {
            return {
                _id: userId,
                hasFilledBriefing: true,
                currentStageKey: "survey",
                projectStages: [
                    { key: "briefing", status: "completed" },
                    { key: "survey", status: "changes-requested" }
                ]
            };
        },
        async updateProjectStageState() { return { _id: userId }; }
    };
    const proposals = {
        async findByIdAndUserId() {
            return {
                _id: proposalId,
                stageKey: "survey",
                status: "beated",
                userComment: "Ajustar a bancada"
            };
        },
        async update(_id, _userId, update) {
            return { _id: proposalId, stageKey: "survey", userComment: "Ajustar a bancada", ...update };
        }
    };
    const service = new ClientProposalService(clients, proposals, {});

    const result = await service.resend(userId, proposalId);

    assert.equal(result.proposal.status, "resent");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "awaiting-approval");
});

test("administrador remove um anexo da proposta e atualiza o banco", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const attachments = [
        "https://drive.google.com/file/d/arquivo-1/view",
        "https://drive.google.com/file/d/arquivo-2/view"
    ];
    const storageCalls = [];
    const repository = {
        async findByIdAndUserId() { return { _id: proposalId, attachments }; },
        async updateAttachments(id, ownerId, updatedAttachments) {
            assert.equal(id, proposalId);
            assert.equal(ownerId, userId);
            assert.deepEqual(updatedAttachments, [attachments[1]]);
            return { _id: id, attachments: updatedAttachments };
        }
    };
    const storage = {
        async setProposalAttachmentTrashed(url, trashed) { storageCalls.push({ url, trashed }); }
    };
    const service = new ClientProposalService(
        { async findById() { return { _id: userId }; } },
        repository,
        storage
    );

    const updated = await service.removeAttachment(userId, proposalId, "0");

    assert.deepEqual(updated.attachments, [attachments[1]]);
    assert.deepEqual(storageCalls, [{ url: attachments[0], trashed: true }]);
});

test("restaura o anexo no Drive quando a atualização da proposta falha", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const attachmentUrl = "https://drive.google.com/file/d/arquivo-1/view";
    const storageCalls = [];
    const service = new ClientProposalService(
        { async findById() { return { _id: userId }; } },
        {
            async findByIdAndUserId() {
                return { _id: proposalId, attachments: [attachmentUrl, "https://drive.google.com/file/d/arquivo-2/view"] };
            },
            async updateAttachments() { throw new Error("Falha no banco"); }
        },
        {
            async setProposalAttachmentTrashed(url, trashed) { storageCalls.push({ url, trashed }); }
        }
    );

    await assert.rejects(() => service.removeAttachment(userId, proposalId, "0"), /Falha no banco/);
    assert.deepEqual(storageCalls, [
        { url: attachmentUrl, trashed: true },
        { url: attachmentUrl, trashed: false }
    ]);
});

test("não permite remover o único anexo da proposta", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    let storageCalled = false;
    const service = new ClientProposalService(
        { async findById() { return { _id: userId }; } },
        {
            async findByIdAndUserId() {
                return { _id: proposalId, attachments: ["https://drive.google.com/file/d/arquivo-1/view"] };
            }
        },
        {
            async setProposalAttachmentTrashed() { storageCalled = true; }
        }
    );

    await assert.rejects(
        () => service.removeAttachment(userId, proposalId, "0"),
        error => error.status === 409
    );
    assert.equal(storageCalled, false);
});

test("fluxo exibe contrato concluído e inicia de fato no briefing", () => {
    const initial = initialProjectStages(false);
    assert.equal(initial.length, 8);
    assert.deepEqual(initial.map(stage => stage.key), [
        "contract",
        "briefing",
        "layout",
        "project-development",
        "survey",
        "budgets-definitions",
        "executive-project",
        "final-delivery"
    ]);
    assert.equal(initial[0].status, "completed");
    assert.equal(initial[1].status, "not-started");

    const submitted = normalizedProjectStages(undefined, true);
    assert.equal(submitted[0].status, "completed");
    assert.equal(submitted[1].status, "awaiting-approval");
    assert.ok(submitted.slice(2).every(stage => stage.status === "not-started"));
});

test("envio do briefing preserva a ordem configurada do cliente", () => {
    const configured = initialProjectStages(false).map((stage, index) => ({ ...stage, index }));
    const reordered = [
        configured[0], configured[1], configured[4], configured[2],
        configured[3], configured[5], configured[6], configured[7]
    ].map((stage, index) => ({ ...stage, index }));

    const submitted = projectStagesAfterBriefingSubmission(reordered);
    assert.equal(hasConfiguredProjectStageOrder(submitted), true);
    assert.deepEqual(submitted.map(stage => stage.key), reordered.map(stage => stage.key));
    assert.equal(submitted.find(stage => stage.key === "briefing")?.status, "awaiting-approval");
});

test("propostas respeitam a ordem personalizada para concluir etapas anteriores", () => {
    const ordered = [
        "contract", "briefing", "survey", "layout", "project-development",
        "budgets-definitions", "executive-project", "final-delivery"
    ].map((key, index) => ({ key, status: key === "contract" ? "completed" : "not-started", index }));

    const updated = projectStagesForProposal(ordered, true, "layout", "awaiting-approval");
    assert.equal(updated.find(stage => stage.key === "survey")?.status, "completed");
    assert.equal(updated.find(stage => stage.key === "layout")?.status, "awaiting-approval");
    assert.equal(updated.find(stage => stage.key === "project-development")?.status, "not-started");
});

test("extrai, normaliza e deduplica somente e-mails dos responsáveis", () => {
    const briefing = {
        sections: [{
            answers: [
                { key: "resident-1-mail", value: " Cliente@Example.com " },
                { key: "resident-2-mail", value: "cliente@example.com" },
                { key: "resident-3-mail", value: "email-invalido" },
                { key: "contato-secundario", value: "outro@example.com" }
            ]
        }]
    };

    assert.deepEqual(extractResidentEmails(briefing), ["cliente@example.com"]);
});

test("compartilhamento de briefing continua após falha e identifica permissões existentes", async () => {
    const calls = [];
    const storage = {
        async grantFolderReadAccess(folderId, email) {
            calls.push({ folderId, email });
            if (email === "falha@example.com") throw new Error("Drive indisponível");
            return { email, created: email === "novo@example.com" };
        }
    };
    const service = new BriefingFolderAccessService(storage);
    const result = await service.execute("pasta-1", {
        answers: [
            { key: "resident-1-mail", value: "novo@example.com" },
            { key: "resident-2-mail", value: "existente@example.com" },
            { key: "resident-3-mail", value: "falha@example.com" }
        ]
    });

    assert.equal(result.emailsFound, 3);
    assert.equal(result.permissionsCreated, 1);
    assert.equal(result.permissionsExisting, 1);
    assert.equal(result.failures.length, 1);
    assert.deepEqual(calls, [
        { folderId: "pasta-1", email: "novo@example.com" },
        { folderId: "pasta-1", email: "existente@example.com" },
        { folderId: "pasta-1", email: "falha@example.com" }
    ]);
});

test("administrador altera etapa atual e status no mesmo documento do cliente", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const updates = [];
    const repository = {
        async findByIdForAdmin() {
            return {
                _id: clientId,
                hasFilledBriefing: true,
                projectStages: [
                    { key: "briefing", status: "awaiting-approval" },
                    { key: "survey", status: "not-started" }
                ]
            };
        },
        async updateProjectStageState(id, currentStageKey, projectStages) {
            updates.push({ id, currentStageKey, projectStages });
            return { _id: id };
        }
    };
    const service = new UpdateClientProjectStageService(repository);
    const result = await service.execute(clientId, "survey", "in-progress");

    assert.equal(result.currentStageKey, "survey");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "in-progress");
    assert.equal(result.projectStages.find(stage => stage.key === "briefing")?.status, "awaiting-approval");
    assert.equal(result.projectStages.length, 8);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].currentStageKey, "survey");
});

test("administrador define índices para uma ordem completa e preserva os status", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const updates = [];
    const repository = {
        async findByIdForAdmin() {
            return {
                _id: clientId,
                hasFilledBriefing: true,
                currentStageKey: "survey",
                projectStages: [
                    { key: "contract", status: "completed" },
                    { key: "briefing", status: "completed" },
                    { key: "survey", status: "in-progress" }
                ]
            };
        },
        async updateProjectStageState(id, currentStageKey, projectStages) {
            updates.push({ id, currentStageKey, projectStages });
            return { _id: id };
        }
    };
    const order = [
        "contract", "briefing", "survey", "layout", "project-development",
        "budgets-definitions", "executive-project", "final-delivery"
    ];
    const service = new UpdateClientProjectStageService(repository);
    const result = await service.updateOrder(clientId, order);

    assert.equal(result.currentStageKey, "survey");
    assert.deepEqual(result.projectStages.map(stage => stage.key), order);
    assert.deepEqual(result.projectStages.map(stage => stage.index), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(result.projectStages[2].status, "in-progress");
    assert.equal(hasConfiguredProjectStageOrder(result.projectStages), true);
    assert.equal(updates.length, 1);
});

test("ordem rejeita etapas ausentes, repetidas ou Briefing fora da primeira posição real", async () => {
    const service = new UpdateClientProjectStageService({});
    const clientId = "507f1f77bcf86cd799439011";

    await assert.rejects(
        () => service.updateOrder(clientId, ["contract", "briefing"]),
        error => error.status === 400
    );
    await assert.rejects(
        () => service.updateOrder(clientId, [
            "contract", "survey", "briefing", "layout", "project-development",
            "budgets-definitions", "executive-project", "final-delivery"
        ]),
        error => error.status === 400
    );
});

test("atualização de etapa rejeita chaves e status fora da legenda", async () => {
    const service = new UpdateClientProjectStageService({});
    const clientId = "507f1f77bcf86cd799439011";

    await assert.rejects(
        () => service.execute(clientId, "etapa-inexistente", "in-progress"),
        error => error.status === 400
    );
    await assert.rejects(
        () => service.execute(clientId, "survey", "status-inexistente"),
        error => error.status === 400
    );
});

test("remoção de cliente exige correspondência exata do nome", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    let deleted = false;
    let touchedDrive = false;
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        { async deleteByIdAndName() { deleted = true; return true; } },
        { async setClientFolderTrashed() { touchedDrive = true; } }
    );

    for (const confirmation of ["Maria da Silva ", "maria da silva", "Maria  da Silva", undefined]) {
        await assert.rejects(() => service.execute(clientId, confirmation), error => error.status === 400);
    }
    assert.equal(deleted, false);
    assert.equal(touchedDrive, false);
});

test("remoção confirmada apaga os dados e envia a pasta do cliente à lixeira", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const driveUpdates = [];
    const deletions = [];
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        {
            async deleteByIdAndName(id, name) {
                deletions.push({ id, name });
                return true;
            }
        },
        {
            async setClientFolderTrashed(folderId, trashed) {
                driveUpdates.push({ folderId, trashed });
            }
        }
    );

    await service.execute(clientId, "Maria da Silva");
    assert.deepEqual(deletions, [{ id: clientId, name: "Maria da Silva" }]);
    assert.deepEqual(driveUpdates, [{ folderId: "pasta-1", trashed: true }]);
});

test("falha ao apagar dados restaura a pasta do cliente no Drive", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const driveUpdates = [];
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        { async deleteByIdAndName() { throw new Error("MongoDB indisponível"); } },
        {
            async setClientFolderTrashed(folderId, trashed) {
                driveUpdates.push({ folderId, trashed });
            }
        }
    );

    await assert.rejects(() => service.execute(clientId, "Maria da Silva"), /MongoDB indisponível/);
    assert.deepEqual(driveUpdates, [
        { folderId: "pasta-1", trashed: true },
        { folderId: "pasta-1", trashed: false }
    ]);
});

test("listagem administrativa retorna a etapa e o status atuais de cada cliente", async () => {
    const firstId = { toString: () => "507f1f77bcf86cd799439011" };
    const secondId = { toString: () => "507f1f77bcf86cd799439012" };
    const clients = {
        async findAllForAdmin() {
            return [
                {
                    _id: firstId,
                    name: "Cliente A",
                    hasFilledBriefing: true,
                    currentStageKey: "survey",
                    projectStages: [
                        { key: "contract", status: "completed", index: 0 },
                        { key: "briefing", status: "completed", index: 1 },
                        { key: "survey", status: "in-progress", index: 2 },
                        { key: "layout", status: "not-started", index: 3 },
                        { key: "project-development", status: "not-started", index: 4 },
                        { key: "budgets-definitions", status: "not-started", index: 5 },
                        { key: "executive-project", status: "not-started", index: 6 },
                        { key: "final-delivery", status: "not-started", index: 7 }
                    ]
                },
                {
                    _id: secondId,
                    name: "Cliente B",
                    hasFilledBriefing: false,
                    projectStages: []
                }
            ];
        }
    };
    const briefings = {
        async findByClientIds() {
            return [{
                clientId: firstId,
                briefingDefinition: { description: { type: "Apartamento" } }
            }];
        }
    };
    const service = new ListClientsService(clients, briefings);

    const result = await service.execute();
    assert.deepEqual(result.map(client => ({
        name: client.name,
        type: client.type,
        stage: client.currentStageKey,
        status: client.currentStageStatus
    })), [
        { name: "Cliente A", type: "Apartamento", stage: "survey", status: "in-progress" },
        { name: "Cliente B", type: "Não informado", stage: "briefing", status: "not-started" }
    ]);
});
