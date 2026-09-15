import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import mongoose from "mongoose";
import { AdminController } from "../dist/src/controllers/admin.controller.js";
import { ClientController } from "../dist/src/controllers/client.controller.js";
import { AdminPaymentsController } from "../dist/src/controllers/admin-payments.controller.js";
import { ClientPaymentsController } from "../dist/src/controllers/client-payments.controller.js";
import { AdminProposalsController } from "../dist/src/controllers/admin-proposals.controller.js";
import { AdminReportsController } from "../dist/src/controllers/admin-reports.controller.js";
import { ClientApprovalsController } from "../dist/src/controllers/client-approvals.controller.js";
import adminRoutes from "../dist/src/routes/adminRoutes.js";
import clientRoutes from "../dist/src/routes/clientRoutes.js";
import { createAuthenticationGuard } from "../dist/src/middleware/authentication.middleware.js";
import { errorHandler } from "../dist/src/middleware/error-handler.middleware.js";
import { ApplicationError } from "../dist/src/application/errors/application-error.js";

function financialApp(service, role = "admin") {
    const guard = createAuthenticationGuard({
        async authenticate(token) {
            if (token !== "admin" && token !== "client") return undefined;
            return { subject: `authenticated-${token}`, role: token, sessionId: "session-test" };
        }
    });
    const app = express();
    app.use(express.json());
    // Os demais casos de uso não são executados por esta suíte.
    app.use(role === "admin"
        ? adminRoutes(new AdminController(undefined, undefined, undefined, undefined, undefined, undefined),
            guard, new AdminPaymentsController(service), new AdminProposalsController({}), new AdminReportsController({}))
        : clientRoutes(new ClientController(undefined, undefined, undefined, undefined),
            guard, new ClientPaymentsController(service), new ClientApprovalsController({}, {})));
    app.use(errorHandler);
    return app;
}

function authorized(role = "admin", body) {
    return {
        headers: { Authorization: `Bearer ${role}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    };
}

async function withServer(app, assertion) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Endereço de teste indisponível");
    try {
        await assertion(`http://127.0.0.1:${address.port}`);
    } finally {
        server.close();
        await once(server, "close");
    }
}

const pageResponse = {
    payments: [{ id: "payment-page-2", title: "Página 2" }],
    page: { limit: 7, hasMore: true, nextCursor: "next-cursor" },
    summary: { paymentCount: 30, totalAmountCents: 300000, paidAmountCents: 100000, remainingAmountCents: 200000 },
    highlight: {
        paymentId: "payment-outside-page", paymentTitle: "Histórico", partType: "installment",
        installmentNumber: 4, label: "Parcela 4", amountCents: 25000,
        dueDate: "2026-08-01", isPaid: false, hasActivePix: false
    }
};

test("mutações administrativas preservam parâmetros, status e autoria da sessão", async () => {
    const calls = [];
    const payment = { id: "payment-1", version: 4 };
    const body = { version: 3, isPaid: true, confirmedReceiptHistoryAcknowledged: true, actor: { id: "forged" } };
    const actor = { id: "authenticated-admin", sessionId: "session-test", role: "admin" };
    const service = Object.fromEntries(["create", "edit", "remove", "setDownPaymentPaid", "setInstallmentPaid"]
        .map(method => [method, async (...args) => { calls.push([method, ...args]); return payment; }]));
    await withServer(financialApp(service), async baseUrl => {
        const path = "/api/admin/clients/client-123/payments";
        for (const [method, suffix, status] of [
            ["POST", "", 201], ["PUT", "/payment-1", 200], ["DELETE", "/payment-1", 204],
            ["PATCH", "/payment-1/down-payment", 200], ["PATCH", "/payment-1/installments/2", 200]
        ]) {
            const response = await fetch(`${baseUrl}${path}${suffix}`, { ...authorized("admin", body), method });
            assert.equal(response.status, status);
            if (status === 204) assert.equal(await response.text(), "");
            else assert.deepEqual(await response.json(), { payment });
        }
    });
    assert.deepEqual(calls, [
        ["create", "client-123", body, actor],
        ["edit", "client-123", "payment-1", body, actor],
        ["remove", "client-123", "payment-1", 3, true, actor],
        ["setDownPaymentPaid", "client-123", "payment-1", true, 3, actor],
        ["setInstallmentPaid", "client-123", "payment-1", "2", true, 3, actor]
    ]);
});

test("prévia preserva resposta e encaminha exceção síncrona ao middleware", async () => {
    const preview = { totalAmountCents: 10000 };
    await withServer(financialApp({ preview(body) {
        if (body.invalid) throw new ApplicationError("Valor inválido", 422);
        return preview;
    } }), async baseUrl => {
        for (const [body, status, expected] of [[{}, 200, { preview }], [{ invalid: true }, 422, { message: "Valor inválido" }]]) {
            const response = await fetch(`${baseUrl}/api/admin/payments/preview`, { ...authorized("admin", body), method: "POST" });
            assert.equal(response.status, status);
            assert.deepEqual(await response.json(), expected);
        }
    });
});

test("Pix preserva contrato e usa autoria autenticada mesmo com identidade no payload", async () => {
    const calls = [];
    const result = { payload: "pix-test", expiresAt: "2026-09-15T12:00:00Z" };
    await withServer(financialApp({ async generatePix(...args) { calls.push(args); return result; } }, "client"), async baseUrl => {
        const response = await fetch(`${baseUrl}/api/client/payments/payment-1/pix`, {
            ...authorized("client", { clientId: "forged", partType: "installment", installmentNumber: 2 }), method: "POST"
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), result);
    });
    assert.deepEqual(calls, [["authenticated-client", "payment-1", "installment", 2,
        { id: "authenticated-client", sessionId: "session-test", role: "client" }]]);
});

test("erros financeiros mantêm mensagens legadas sem detalhes internos nos logs", async t => {
    const logs = [];
    t.mock.method(console, "error", (...args) => logs.push(args));
    const secret = "segredo-que-nao-pode-vazar";
    for (const [role, path, method, operation, error, status, message] of [
        ["admin", "/api/admin/clients/c/payments", "GET", "list", new mongoose.Error.ValidationError(), 400, "Dados do pagamento inválidos"],
        ["admin", "/api/admin/clients/c/payments", "GET", "list", new mongoose.Error.CastError("ObjectId", secret, "id"), 400, "Dados do pagamento inválidos"],
        ["admin", "/api/admin/clients/c/payments", "GET", "list", new Error(secret), 500, "Erro interno ao processar pagamento"],
        ["client", "/api/client/payments", "GET", "listForClient", new Error(secret), 500, "Erro ao carregar pagamentos."],
        ["client", "/api/client/payments/p/pix", "POST", "generatePix", new Error(secret), 500, "Não foi possível gerar o código Pix."],
        ["client", "/api/client/payments/p/pix", "POST", "generatePix", new ApplicationError("Pagamento não encontrado", 404), 404, "Pagamento não encontrado"],
        ["admin", "/api/admin/clients/c/payments/p", "PUT", "edit", new ApplicationError("Pagamento alterado por outra sessão", 409), 409, "Pagamento alterado por outra sessão"]
    ]) {
        await withServer(financialApp({ async [operation]() { throw error; } }, role), async baseUrl => {
            const response = await fetch(`${baseUrl}${path}`, { ...authorized(role), method });
            assert.equal(response.status, status);
            assert.deepEqual(await response.json(), { message });
        });
    }
    assert.equal(logs.length, 3);
    assert.equal(JSON.stringify(logs).includes(secret), false);
});

test("todas as rotas financeiras exigem sessão do papel correto antes do serviço", async () => {
    for (const [role, endpoints] of [
        ["admin", [["POST", "/api/admin/payments/preview"], ["GET", "/api/admin/clients/c/payments"],
            ["POST", "/api/admin/clients/c/payments"], ["PUT", "/api/admin/clients/c/payments/p"],
            ["DELETE", "/api/admin/clients/c/payments/p"], ["PATCH", "/api/admin/clients/c/payments/p/down-payment"],
            ["PATCH", "/api/admin/clients/c/payments/p/installments/1"]]],
        ["client", [["GET", "/api/client/payments"], ["POST", "/api/client/payments/p/pix"]]]
    ]) {
        await withServer(financialApp({}, role), async baseUrl => {
            for (const [method, path] of endpoints) {
                for (const options of [{}, authorized(role === "admin" ? "client" : "admin")]) {
                    const response = await fetch(`${baseUrl}${path}`, { ...options, method });
                    assert.equal(response.status, 401);
                    assert.deepEqual(await response.json(), { message: "Sessão inválida, revogada ou expirada." });
                }
            }
        });
    }
});

test("HTTP administrativo preserva cursor, limite, resumo e destaque", async () => {
    const calls = [];
    const app = financialApp({
        async list(clientId, cursor, limit) {
            calls.push({ clientId, cursor, limit });
            return pageResponse;
        }
    });

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/admin/clients/client-123/payments?cursor=opaque-cursor&limit=7`, authorized());
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), pageResponse);
        assert.deepEqual(calls, [{ clientId: "client-123", cursor: "opaque-cursor", limit: "7" }]);
    });
});

test("HTTP do cliente usa exclusivamente o sujeito autenticado", async () => {
    const calls = [];
    const app = financialApp({
        async listForClient(clientId, cursor, limit) {
            calls.push({ clientId, cursor, limit });
            return pageResponse;
        }
    }, "client");

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/client/payments?cursor=second-page&limit=5&clientId=forged`, authorized("client"));
        assert.equal(response.status, 200);
        assert.equal((await response.json()).highlight.paymentId, "payment-outside-page");
        assert.deepEqual(calls, [{ clientId: "authenticated-client", cursor: "second-page", limit: "5" }]);
    });
});

test("HTTP financeiro converte erro de aplicação sem expor detalhes internos", async () => {
    const app = financialApp({
        async list() { throw new ApplicationError("Cursor de paginação inválido", 400); }
    });

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/admin/clients/client-123/payments?cursor=invalid`, authorized());
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { message: "Cursor de paginação inválido" });
    });
});
