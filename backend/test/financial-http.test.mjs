import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { AdminController } from "../dist/src/controllers/admin.controller.js";
import { ClientController } from "../dist/src/controllers/client.controller.js";
import { ApplicationError } from "../dist/src/application/errors/application-error.js";

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

test("HTTP administrativo preserva cursor, limite, resumo e destaque", async () => {
    const calls = [];
    const controller = new AdminController({
        async list(clientId, cursor, limit) {
            calls.push({ clientId, cursor, limit });
            return pageResponse;
        }
    });
    const app = express();
    app.get("/api/admin/clients/:id/payments", controller.clientPayments);

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/admin/clients/client-123/payments?cursor=opaque-cursor&limit=7`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), pageResponse);
        assert.deepEqual(calls, [{ clientId: "client-123", cursor: "opaque-cursor", limit: "7" }]);
    });
});

test("HTTP do cliente usa exclusivamente o sujeito autenticado", async () => {
    const calls = [];
    const controller = new ClientController({
        async listForClient(clientId, cursor, limit) {
            calls.push({ clientId, cursor, limit });
            return pageResponse;
        }
    });
    const app = express();
    app.use((_request, response, next) => {
        response.locals.auth = { subject: "authenticated-client", role: "client", sessionId: "session-test" };
        next();
    });
    app.get("/api/client/payments", controller.payments);

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/client/payments?cursor=second-page&limit=5`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).highlight.paymentId, "payment-outside-page");
        assert.deepEqual(calls, [{ clientId: "authenticated-client", cursor: "second-page", limit: "5" }]);
    });
});

test("HTTP financeiro converte erro de aplicação sem expor detalhes internos", async () => {
    const controller = new AdminController({
        async list() { throw new ApplicationError("Cursor de paginação inválido", 400); }
    });
    const app = express();
    app.get("/api/admin/clients/:id/payments", controller.clientPayments);

    await withServer(app, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/admin/clients/client-123/payments?cursor=invalid`);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { message: "Cursor de paginação inválido" });
    });
});
