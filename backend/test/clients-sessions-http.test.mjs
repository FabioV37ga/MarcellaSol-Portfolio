import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { AdminClientsController } from "../dist/src/controllers/admin-clients.controller.js";
import { AdminPaymentsController } from "../dist/src/controllers/admin-payments.controller.js";
import { AdminProposalsController } from "../dist/src/controllers/admin-proposals.controller.js";
import { AdminReportsController } from "../dist/src/controllers/admin-reports.controller.js";
import { AdminSessionsController } from "../dist/src/controllers/admin-sessions.controller.js";
import { AdminViewsController } from "../dist/src/controllers/admin-views.controller.js";
import { ClientApprovalsController } from "../dist/src/controllers/client-approvals.controller.js";
import { ClientBriefingController } from "../dist/src/controllers/client-briefing.controller.js";
import { ClientPaymentsController } from "../dist/src/controllers/client-payments.controller.js";
import { ClientSessionsController } from "../dist/src/controllers/client-sessions.controller.js";
import { ClientViewsController } from "../dist/src/controllers/client-views.controller.js";
import { createAuthenticationGuard } from "../dist/src/middleware/authentication.middleware.js";
import { errorHandler } from "../dist/src/middleware/error-handler.middleware.js";
import adminRoutes from "../dist/src/routes/adminRoutes.js";
import clientRoutes from "../dist/src/routes/clientRoutes.js";
import viewRoutes from "../dist/src/routes/viewRoutes.js";

function testApp() {
    const calls = [];
    const clients = {
        async execute() { calls.push(["list"]); return [{ id: "client-1", name: "Cliente" }]; },
        async executeOne(id) { calls.push(["one", id]); return { id, name: "Cliente" }; }
    };
    const projectStages = {
        async execute(id, stageKey, status) { calls.push(["stage", id, stageKey, status]); return { currentStageKey: stageKey }; },
        async updateOrder(id, stageKeys) { calls.push(["order", id, stageKeys]); return { currentStageKey: stageKeys[0] }; }
    };
    const authenticate = {
        async execute(role, login) {
            calls.push(["login", role, login]);
            return { account: { _id: "client-1", name: "Cliente", hasFilledBriefing: true, briefing: {} }, token: `${role}-token` };
        }
    };
    const sessions = { async revoke(principal) { calls.push(["logout", principal.role]); } };
    const repository = { async findById(id) { calls.push(["session", id]); return { name: "Cliente", hasFilledBriefing: true }; } };
    const briefing = { async execute(command) { calls.push(["briefing", command]); return { hasFilledBriefing: true }; } };
    const views = {
        async findByPermission(permission) { calls.push(["view", permission]); return { permission }; },
        async findAdminBriefingViews() { calls.push(["briefing-views"]); return [{ key: "intro" }]; }
    };
    const guard = createAuthenticationGuard({
        async authenticate(token) {
            if (token !== "admin" && token !== "client") return undefined;
            return { subject: `${token}-1`, role: token, sessionId: "session-1", name: "Administrador" };
        }
    });
    const app = express();
    app.use(express.json());
    app.use(adminRoutes(
        new AdminSessionsController(authenticate, sessions), guard, new AdminPaymentsController({}),
        new AdminProposalsController({}), new AdminReportsController({}),
        new AdminClientsController({ execute: async () => ({}) }, clients, projectStages, { execute: async () => undefined })
    ));
    app.use(clientRoutes(
        new ClientBriefingController(briefing), guard, new ClientPaymentsController({}), new ClientApprovalsController({}, {}),
        new ClientSessionsController(repository, authenticate, sessions)
    ));
    app.use(viewRoutes(new AdminViewsController(views), new ClientViewsController(views, repository), guard));
    app.use(errorHandler);
    return { app, calls };
}

async function withServer(app, assertion) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try { await assertion(`http://127.0.0.1:${server.address().port}`); }
    finally { server.close(); await once(server, "close"); }
}

const authorized = (role, method = "GET", body) => ({
    method,
    headers: { Authorization: `Bearer ${role}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
});

test("rotas administrativas delegam clientes e etapas ao controller específico", async () => {
    const { app, calls } = testApp();
    await withServer(app, async base => {
        const list = await fetch(`${base}/api/admin/clients`, authorized("admin"));
        assert.equal(list.status, 200);
        assert.deepEqual((await list.json()).clients, [{ id: "client-1", name: "Cliente" }]);

        const stage = await fetch(`${base}/api/admin/clients/client-1/project-stage`,
            authorized("admin", "PATCH", { stageKey: "layout", status: "in-progress" }));
        assert.equal(stage.status, 200);
        assert.deepEqual(calls.at(-1), ["stage", "client-1", "layout", "in-progress"]);
    });
});

test("rotas de sessão preservam login, consulta autenticada e logout", async () => {
    const { app, calls } = testApp();
    await withServer(app, async base => {
        const login = await fetch(`${base}/api/admin/login`, authorized("admin", "POST", { login: "admin", password: "secret" }));
        assert.equal(login.status, 200);
        assert.equal((await login.json()).token, "admin-token");

        const session = await fetch(`${base}/api/client/session`, authorized("client"));
        assert.equal(session.status, 200);
        assert.deepEqual(await session.json(), { name: "Cliente", hasFilledBriefing: true });

        const logout = await fetch(`${base}/api/client/logout`, authorized("client", "POST"));
        assert.equal(logout.status, 204);
        assert.deepEqual(calls.at(-1), ["logout", "client"]);
    });
});

test("briefing e views usam controllers específicos e preservam os contratos", async () => {
    const { app, calls } = testApp();
    await withServer(app, async base => {
        const briefing = await fetch(`${base}/api/client/briefing`,
            authorized("client", "POST", { briefing: { objective: "Site" }, fileManifest: [] }));
        assert.equal(briefing.status, 200);
        assert.equal((await briefing.json()).hasFilledBriefing, true);
        assert.equal(calls.at(-1)[1].clientId, "client-1");

        const adminView = await fetch(`${base}/api/view/admin/briefing`, authorized("admin", "POST"));
        assert.equal(adminView.status, 200);
        assert.deepEqual((await adminView.json()).views, [{ key: "intro" }]);

        const clientView = await fetch(`${base}/api/view/client`, authorized("client", "POST"));
        assert.equal(clientView.status, 200);
        const payload = await clientView.json();
        assert.equal(payload.view.permission, "client");
        assert.equal(payload.clientObject.name, "Cliente");
    });
});
