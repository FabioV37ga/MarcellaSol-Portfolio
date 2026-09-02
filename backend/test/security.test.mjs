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
import { initialProjectStages, normalizedProjectStages } from "../dist/src/models/projectStage.js";
import { BriefingFolderAccessService } from "../dist/src/application/briefing-folder-access.service.js";
import { extractResidentEmails } from "../dist/src/services/briefing-emails.js";
import { UpdateClientProjectStageService } from "../dist/src/application/update-client-project-stage.service.js";

process.env.AUTH_TOKEN_SECRET = "test-only-session-secret-with-at-least-32-characters";

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

    const result = await service.approve(userId, proposalId);
    assert.equal(result.proposal.status, "approved");
    assert.deepEqual(calls, [{ id: proposalId, ownerId: userId, status: "approved", userComment: "" }]);
    assert.equal(result.currentStageKey, "survey");
    assert.equal(result.projectStages.find(stage => stage.key === "briefing")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "layout")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "project-development")?.status, "completed");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "approved");
    assert.equal(stageUpdates.length, 1);
});

test("rebatida exige comentário e recusa proposta já decidida", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const repository = {
        async decide() { return null; },
        async findByIdAndUserId() { return { _id: proposalId, status: "approved" }; }
    };
    const service = new ClientProposalService({}, repository, {});

    await assert.rejects(() => service.beat(userId, proposalId, "   "), error => error.status === 400);
    await assert.rejects(
        () => service.beat(userId, proposalId, "Precisa de ajustes"),
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
    assert.deepEqual(result.projectStages.slice(0, 4), [
        { key: "briefing", status: "completed" },
        { key: "layout", status: "completed" },
        { key: "project-development", status: "completed" },
        { key: "survey", status: "awaiting-approval" }
    ]);
    assert.equal(stageUpdates.length, 1);
});

test("cliente que rebate proposta coloca a etapa em alterações solicitadas", async () => {
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

    const result = await service.beat(userId, proposalId, "Ajustar a bancada");

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

test("fluxo inicia no briefing e aguarda aprovação após seu preenchimento", () => {
    const initial = initialProjectStages(false);
    assert.equal(initial.length, 7);
    assert.deepEqual(initial.map(stage => stage.key), [
        "briefing",
        "layout",
        "project-development",
        "survey",
        "budgets-definitions",
        "executive-project",
        "final-delivery"
    ]);
    assert.equal(initial[0].status, "not-started");

    const submitted = normalizedProjectStages(undefined, true);
    assert.equal(submitted[0].status, "awaiting-approval");
    assert.ok(submitted.slice(1).every(stage => stage.status === "not-started"));
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
    assert.equal(result.projectStages.length, 7);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].currentStageKey, "survey");
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
