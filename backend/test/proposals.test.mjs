import assert from "node:assert/strict";
import test from "node:test";
import { ClientProposalService } from "../dist/src/application/client-proposal.service.js";
import { initialProjectStages } from "../dist/src/models/projectStage.js";

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
        async setProposalFolderTrashed() { }
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

test("cliente anexa arquivos à resposta e preserva o histórico da proposta", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const uploads = [];
    let savedResponse;
    const clients = {
        async findById() {
            return {
                _id: userId,
                driveFolderId: "pasta-cliente",
                hasFilledBriefing: true,
                projectStages: [{ key: "briefing", status: "awaiting-approval" }]
            };
        },
        async updateProjectStageState() { return { _id: userId }; }
    };
    const repository = {
        async findByIdAndUserId() {
            return {
                _id: proposalId,
                title: "Layout v1",
                stageKey: "briefing",
                status: "sent",
                userComment: "",
                clientResponses: []
            };
        },
        async decide(_id, _userId, status, userComment, response, attachmentFolderId) {
            savedResponse = response;
            return {
                _id: proposalId,
                stageKey: "briefing",
                status,
                userComment,
                attachmentFolderId,
                clientResponses: [response]
            };
        }
    };
    const storage = {
        async uploadProposal(clientFolderId, id, title, files, author, responseIndex) {
            uploads.push({ clientFolderId, id, title, files, author, responseIndex });
            return {
                folderId: "pasta-proposta",
                attachmentUrls: ["https://drive.google.com/file/d/resposta-1/view"]
            };
        },
        async setProposalAttachmentTrashed() { }
    };
    const service = new ClientProposalService(clients, repository, storage);
    const file = { originalname: "referencia.pdf" };

    const result = await service.approve(userId, proposalId, "Aprovado com referência", [file]);

    assert.equal(uploads.length, 1);
    assert.equal(uploads[0].author, "client");
    assert.equal(uploads[0].responseIndex, 1);
    assert.equal(savedResponse.decision, "approved");
    assert.deepEqual(savedResponse.attachments, ["https://drive.google.com/file/d/resposta-1/view"]);
    assert.equal(result.proposal.clientResponses.length, 1);
});

test("confirmação de alterações encerra proposta e deixa etapa aguardando cliente", async () => {
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
        async completeChanges(_id, _userId) {
            return { _id: proposalId, stageKey: "survey", userComment: "Ajustar a bancada", status: "changes-completed" };
        }
    };
    const service = new ClientProposalService(clients, proposals, {});

    const result = await service.confirmChanges(userId, proposalId);

    assert.equal(result.proposal.status, "changes-completed");
    assert.equal(result.projectStages.find(stage => stage.key === "survey")?.status, "awaiting-client");
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

test("listagem de propostas devolve cursor da última proposta da página", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const proposalId = "507f1f77bcf86cd799439012";
    const updatedAt = new Date("2026-09-24T12:00:00.000Z");
    const calls = [];
    const service = new ClientProposalService(
        { async findById() { return { _id: userId, hasFilledBriefing: true }; } },
        {
            async findPageByUserId(id, options) {
                calls.push({ id, options });
                return {
                    records: [{ _id: { toString: () => proposalId }, updatedAt, title: "Proposta" }],
                    hasMore: true
                };
            }
        },
        {}
    );

    const result = await service.list(userId, undefined, "1");

    assert.equal(calls[0].id, userId);
    assert.equal(calls[0].options.limit, 1);
    assert.equal(result.page.hasMore, true);
    assert.deepEqual(
        JSON.parse(Buffer.from(result.page.nextCursor, "base64url").toString("utf8")),
        { updatedAt: updatedAt.toISOString(), id: proposalId }
    );
});

test("listagem de propostas rejeita cursor e limite inválidos antes da consulta", async () => {
    let queried = false;
    const service = new ClientProposalService(
        { async findById() { return { hasFilledBriefing: true }; } },
        { async findPageByUserId() { queried = true; return { records: [], hasMore: false }; } },
        {}
    );

    await assert.rejects(() => service.list("507f1f77bcf86cd799439011", "inválido"), error => error.status === 400);
    await assert.rejects(() => service.list("507f1f77bcf86cd799439011", undefined, "51"), error => error.status === 400);
    assert.equal(queried, false);
});
