import assert from "node:assert/strict";
import test from "node:test";
import { ListClientApprovalsService } from "../dist/src/application/list-client-approvals.service.js";
import { presentClientProposal } from "../dist/src/application/proposals/client-proposal.presenter.js";
import { ApplicationError } from "../dist/src/application/errors/application-error.js";

test("listagem de aprovações rejeita cliente ausente e propaga falhas de consulta", async () => {
    const emptyPage = { proposals: [], page: { limit: 20, hasMore: false } };
    const service = new ListClientApprovalsService({ async findById() { return null; } }, { async list() { return emptyPage; } });
    await assert.rejects(() => service.execute("client"), error => error instanceof ApplicationError
        && error.status === 404 && error.message === "Cliente não encontrado");

    const failure = new Error("Falha de leitura");
    const failing = new ListClientApprovalsService({ async findById() { throw failure; } }, { async list() { return emptyPage; } });
    await assert.rejects(() => failing.execute("client"), error => error === failure);
});

test("apresentação preserva anexos atuais e histórico sem expor campos administrativos", () => {
    const history = [{ decision: "approved", comment: "Comentário", attachments: ["resposta.pdf"], createdAt: "2026-09-15" }];
    const source = {
        _id: "proposal", title: "Título", description: "Texto", userComment: "Comentário", stageKey: "layout", status: "approved",
        createdAt: "2026-09-14", updatedAt: "2026-09-15", attachments: ["atual.pdf"], attachment: "legado.pdf",
        clientResponses: history, userId: "private-owner", attachmentFolderId: "private-folder", __v: 2
    };
    const before = structuredClone(source);
    assert.deepEqual(presentClientProposal(source), {
        _id: "proposal", title: "Título", description: "Texto", userComment: "Comentário", stageKey: "layout", status: "approved",
        createdAt: "2026-09-14", updatedAt: "2026-09-15", attachments: ["atual.pdf"], clientResponses: history
    });
    assert.deepEqual(source, before);
    assert.deepEqual(presentClientProposal({ ...source, attachments: [], attachment: undefined, clientResponses: undefined }).attachments, []);
});

test("listagem mantém etapa atual, ordem personalizada e status existentes", async () => {
    const orderedKeys = ["contract", "briefing", "survey", "layout", "project-development", "budgets-definitions", "executive-project", "final-delivery"];
    const stages = orderedKeys.map((key, index) => ({ key, index,
        status: key === "layout" ? "changes-requested" : "completed" }));
    const client = { currentStageKey: "layout", hasFilledBriefing: true, projectStages: stages };
    const before = structuredClone(client);
    const service = new ListClientApprovalsService(
        { async findById() { return client; } },
        { async list() { return { proposals: [], page: { limit: 20, hasMore: false } }; } }
    );
    const result = await service.execute("client");
    assert.equal(result.currentStageKey, "layout");
    assert.deepEqual(result.projectStages, stages);
    assert.deepEqual(result.proposals, []);
    assert.deepEqual(result.page, { limit: 20, hasMore: false });
    assert.deepEqual(client, before);
});
