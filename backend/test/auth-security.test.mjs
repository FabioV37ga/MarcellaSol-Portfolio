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

process.env.AUTH_TOKEN_SECRET = "test-only-session-secret-with-at-least-32-characters";

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

