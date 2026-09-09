import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { createDiagnosticRoutes } from "../dist/src/routes/diagnosticRoutes.js";
import { createOperationalRoutes } from "../dist/src/routes/operationalRoutes.js";

async function withServer(router, assertion) {
    const app = express();
    app.use(router);
    app.use((_request, response) => response.status(404).json({ message: "not-found" }));
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

test("health verifica o processo sem depender do banco", async () => {
    await withServer(createDiagnosticRoutes(() => false), async baseUrl => {
        const response = await fetch(`${baseUrl}/api/health`);
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.status, "ok");
        assert.equal(body.mongodb, undefined);
    });
});

test("readiness retorna 503 quando o banco está indisponível", async () => {
    await withServer(createDiagnosticRoutes(() => false), async baseUrl => {
        const response = await fetch(`${baseUrl}/api/ready`);
        assert.equal(response.status, 503);
        assert.equal((await response.json()).dependencies.mongodb, "unavailable");
    });
});

test("readiness retorna 200 quando o banco está disponível", async () => {
    await withServer(createDiagnosticRoutes(() => true), async baseUrl => {
        const response = await fetch(`${baseUrl}/api/ready`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).status, "ready");
    });
});

test("readiness retorna 503 quando MongoDB não oferece transações", async () => {
    await withServer(createDiagnosticRoutes(() => ({ connected: true, transactions: false })), async baseUrl => {
        const response = await fetch(`${baseUrl}/api/ready`);
        const body = await response.json();
        assert.equal(response.status, 503);
        assert.equal(body.dependencies.mongodb, "ready");
        assert.equal(body.dependencies.transactions, "unavailable");
    });
});

test("rota de teste não é montada em produção", async () => {
    await withServer(createOperationalRoutes(true), async baseUrl => {
        assert.equal((await fetch(`${baseUrl}/api/test`)).status, 404);
        assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    });
});
