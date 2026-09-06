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

