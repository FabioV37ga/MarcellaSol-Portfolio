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
import { ListClientApprovalsService } from "../dist/src/application/list-client-approvals.service.js";
import adminRoutes from "../dist/src/routes/adminRoutes.js";
import clientRoutes from "../dist/src/routes/clientRoutes.js";
import { createAuthenticationGuard } from "../dist/src/middleware/authentication.middleware.js";
import { errorHandler } from "../dist/src/middleware/error-handler.middleware.js";
import { ApplicationError } from "../dist/src/application/errors/application-error.js";
import { normalizedProjectStages } from "../dist/src/models/projectStage.js";

const proposal = {
    _id: "proposal-1", title: "Layout", description: "Descrição", attachment: "https://example.com/legacy.pdf",
    userComment: "", status: "sent", createdAt: "2026-09-15T10:00:00Z", updatedAt: "2026-09-15T10:00:00Z",
    userId: "private-owner", attachmentFolderId: "private-folder", internalField: "private"
};
const publicProposal = {
    _id: proposal._id, title: proposal.title, description: proposal.description, attachments: [proposal.attachment],
    userComment: "", clientResponses: [], status: "sent", createdAt: proposal.createdAt, updatedAt: proposal.updatedAt
};
const projectState = { currentStageKey: "layout", projectStages: [{ key: "layout", status: "approved" }] };

function proposalApp({ proposals = {}, reports = {}, clients = {} } = {}, role = "admin") {
    const guard = createAuthenticationGuard({
        async authenticate(token) {
            return token === "admin" || token === "client"
                ? { subject: `authenticated-${token}`, role: token, sessionId: "session-test" } : undefined;
        }
    });
    const app = express();
    app.use(express.json());
    app.use(role === "admin"
        ? adminRoutes(new AdminController(undefined, undefined, undefined, undefined, undefined, undefined),
            guard, new AdminPaymentsController({}), new AdminProposalsController(proposals), new AdminReportsController(reports))
        : clientRoutes(new ClientController(clients, undefined, undefined, undefined),
            guard, new ClientPaymentsController({}), new ClientApprovalsController(new ListClientApprovalsService(clients, proposals), proposals)));
    app.use(errorHandler);
    return app;
}

async function withServer(app, assertion) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try { await assertion(`http://127.0.0.1:${server.address().port}`); }
    finally { server.close(); await once(server, "close"); }
}

function requestOptions(role, method = "GET", body) {
    return {
        method,
        headers: { Authorization: `Bearer ${role}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) })
    };
}

function multipart(fields = {}, count = 2) {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    for (let index = 1; index <= count; index++) body.append("attachments", new Blob([`arquivo-${index}`], { type: "application/pdf" }), `anexo-${index}.pdf`);
    return body;
}

test("propostas administrativas preservam parâmetros, envelopes e status em todas as operações", async () => {
    const calls = [];
    const results = { list: [proposal], create: { proposal, ...projectState }, edit: proposal,
        resend: { proposal, ...projectState }, removeAttachment: proposal, remove: undefined };
    const proposals = Object.fromEntries(Object.entries(results).map(([method, result]) => [method, async (...args) => {
        calls.push([method, ...args]); return result;
    }]));
    await withServer(proposalApp({ proposals }), async base => {
        const path = `${base}/api/admin/clients/client-123/proposals`;
        for (const [method, suffix, body, status, expected] of [
            ["GET", "", undefined, 200, { proposals: [proposal] }],
            ["POST", "", multipart({ title: "Título", description: "Texto", stageKey: "layout" }), 201, { proposal, ...projectState }],
            ["PUT", "/proposal-1", multipart({ title: "Editado", description: "Texto", stageKey: "layout" }), 200, { proposal }],
            ["POST", "/proposal-1/resend", undefined, 200, { proposal, ...projectState }],
            ["DELETE", "/proposal-1/attachments/1", undefined, 200, { proposal }],
            ["DELETE", "/proposal-1", undefined, 204, undefined]
        ]) {
            const response = await fetch(`${path}${suffix}`, requestOptions("admin", method, body));
            assert.equal(response.status, status);
            if (status === 204) assert.equal(await response.text(), "");
            else assert.deepEqual(await response.json(), expected);
        }
    });
    assert.deepEqual(calls[0], ["list", "client-123"]);
    for (const [index, method, title] of [[1, "create", "Título"], [2, "edit", "Editado"]]) {
        const args = calls[index];
        assert.equal(args[0], method);
        assert.equal(args[1], "client-123");
        if (method === "edit") assert.equal(args[2], "proposal-1");
        assert.deepEqual({ ...args.at(-2) }, { title, description: "Texto", stageKey: "layout" });
        assert.deepEqual(args.at(-1).map(file => [file.originalname, file.mimetype, file.buffer.toString()]),
            [["anexo-1.pdf", "application/pdf", "arquivo-1"], ["anexo-2.pdf", "application/pdf", "arquivo-2"]]);
    }
    assert.deepEqual(calls.slice(3), [["resend", "client-123", "proposal-1"],
        ["removeAttachment", "client-123", "proposal-1", "1"], ["remove", "client-123", "proposal-1"]]);
});

test("relatórios preservam consulta 200, geração 201 e resposta do serviço", async () => {
    const calls = [];
    const status = { exists: false, folderUrl: "https://example.com/folder" };
    const generated = { exists: true, fileUrl: "https://example.com/report.pdf", folderUrl: status.folderUrl };
    await withServer(proposalApp({ reports: {
        async status(id) { calls.push(["status", id]); return status; },
        async generate(id) { calls.push(["generate", id]); return generated; }
    } }), async base => {
        for (const [method, code, result] of [["GET", 200, status], ["POST", 201, generated]]) {
            const response = await fetch(`${base}/api/admin/clients/client-123/briefing-report`, requestOptions("admin", method));
            assert.equal(response.status, code);
            assert.deepEqual(await response.json(), result);
        }
    });
    assert.deepEqual(calls, [["status", "client-123"], ["generate", "client-123"]]);
});

test("listagem do cliente preserva anexos legados, etapas e omite campos internos", async () => {
    const calls = [];
    await withServer(proposalApp({
        clients: { async findById(id) { calls.push(["client", id]); return { hasFilledBriefing: false }; } },
        proposals: { async list(id) { calls.push(["proposals", id]); return [proposal]; } }
    }, "client"), async base => {
        const response = await fetch(`${base}/api/client/proposals?clientId=forged`, requestOptions("client"));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            currentStageKey: "briefing", projectStages: normalizedProjectStages(undefined, false), proposals: [publicProposal]
        });
    });
    assert.deepEqual(calls, [["proposals", "authenticated-client"], ["client", "authenticated-client"]]);
});

test("aprovação e alteração multipart preservam anexos, confirmação e sujeito da sessão", async () => {
    const calls = [];
    const service = Object.fromEntries(["approve", "beat"].map(method => [method, async (...args) => {
        calls.push([method, ...args]); return { proposal, ...projectState };
    }]));
    await withServer(proposalApp({ proposals: service }, "client"), async base => {
        for (const method of ["approve", "beat"]) {
            const response = await fetch(`${base}/api/client/proposals/proposal-1/${method}`, requestOptions("client", "POST",
                multipart({ comment: "Comentário", confirmRevisionRound: "true", clientId: "forged" })));
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { ...projectState, proposal: publicProposal });
        }
    });
    for (const [method, userId, id, comment, ...rest] of calls) {
        assert.deepEqual([userId, id, comment], ["authenticated-client", "proposal-1", "Comentário"]);
        if (method === "beat") assert.equal(rest[0], true);
        assert.deepEqual(rest.at(-1).map(file => file.buffer.toString()), ["arquivo-1", "arquivo-2"]);
    }
});

test("confirmação JSON aceita apenas true ou string true e mantém anexos opcionais", async () => {
    const calls = [];
    await withServer(proposalApp({ proposals: { async beat(...args) { calls.push(args); return { proposal, ...projectState }; } } }, "client"), async base => {
        for (const confirmation of [true, "true", false, "false", "on", 1, undefined]) {
            const response = await fetch(`${base}/api/client/proposals/proposal-1/beat`, requestOptions("client", "POST", {
                comment: "Texto", confirmRevisionRound: confirmation
            }));
            assert.equal(response.status, 200);
            await response.json();
        }
    });
    assert.deepEqual(calls.map(args => args[3]), [true, true, false, false, false, false, false]);
    assert.ok(calls.every(args => args[4] === undefined));
});

test("propostas e relatórios preservam classificação e mensagens de falha", async t => {
    t.mock.method(console, "error", () => {});
    for (const [role, resource, method, operation, error, status, message] of [
        ["admin", "proposals", "GET", "list", new mongoose.Error.ValidationError(), 400, "Dados da proposta inválidos"],
        ["admin", "proposals", "GET", "list", new mongoose.Error.CastError("ObjectId", "invalid", "id"), 500, "Erro interno ao processar proposta"],
        ["admin", "proposals", "GET", "list", new ApplicationError("Proposta não encontrada", 404), 404, "Proposta não encontrada"],
        ["admin", "briefing-report", "GET", "status", new Error("private"), 500, "Erro interno ao processar relatório do briefing"],
        ["admin", "briefing-report", "POST", "generate", new ApplicationError("Briefing pendente", 409), 409, "Briefing pendente"],
        ["client", "proposals", "GET", "list", new Error("private"), 500, "Erro ao carregar aprovações."],
        ["client", "proposals/proposal-1/approve", "POST", "approve", new Error("private"), 500, "Erro interno ao registrar decisão."],
        ["client", "proposals/proposal-1/beat", "POST", "beat", new ApplicationError("Confirme o uso de 1 rodada de alterações", 400), 400, "Confirme o uso de 1 rodada de alterações"]
    ]) {
        const service = { async [operation]() { throw error; } };
        await withServer(proposalApp({ proposals: service, reports: service, clients: { async findById() { return {}; } } }, role), async base => {
            const prefix = role === "admin" ? "/api/admin/clients/client-123/" : "/api/client/";
            const response = await fetch(`${base}${prefix}${resource}`, requestOptions(role, method));
            assert.equal(response.status, status);
            assert.deepEqual(await response.json(), { message });
        });
    }
});

test("uploads rejeitam excesso antes de executar o caso de uso", async () => {
    let calls = 0;
    for (const [role, path, method] of [
        ["admin", "/api/admin/clients/c/proposals", "POST"],
        ["admin", "/api/admin/clients/c/proposals/p", "PUT"],
        ["client", "/api/client/proposals/p/approve", "POST"],
        ["client", "/api/client/proposals/p/beat", "POST"]
    ]) {
        const proposals = Object.fromEntries(["create", "edit", "approve", "beat"].map(name => [name, () => { calls++; }]));
        await withServer(proposalApp({ proposals }, role), async base => {
            const response = await fetch(`${base}${path}`, requestOptions(role, method, multipart({}, 21)));
            assert.equal(response.status, 400);
            assert.deepEqual(await response.json(), { message: "A proposta pode conter no máximo 20 anexos por envio" });
        });
    }
    assert.equal(calls, 0);
});

test("todas as rotas de propostas e relatórios exigem o papel correto", async () => {
    for (const [role, endpoints] of [
        ["admin", [["GET", "proposals"], ["POST", "proposals"], ["PUT", "proposals/p"],
            ["POST", "proposals/p/resend"], ["DELETE", "proposals/p"], ["DELETE", "proposals/p/attachments/0"],
            ["GET", "briefing-report"], ["POST", "briefing-report"]]],
        ["client", [["GET", "proposals"], ["POST", "proposals/p/approve"], ["POST", "proposals/p/beat"]]]
    ]) {
        await withServer(proposalApp({}, role), async base => {
            for (const [method, path] of endpoints) {
                for (const token of ["invalid", role === "admin" ? "client" : "admin"]) {
                    const prefix = role === "admin" ? "/api/admin/clients/c/" : "/api/client/";
                    const response = await fetch(`${base}${prefix}${path}`, requestOptions(token, method));
                    assert.equal(response.status, 401);
                    await response.json();
                }
            }
        });
    }
});
