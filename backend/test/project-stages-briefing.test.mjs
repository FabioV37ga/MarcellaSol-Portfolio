import assert from "node:assert/strict";
import test from "node:test";
import { ClientProposalService } from "../dist/src/application/client-proposal.service.js";
import { BriefingFolderAccessService } from "../dist/src/application/briefing-folder-access.service.js";
import { UpdateClientProjectStageService } from "../dist/src/application/update-client-project-stage.service.js";
import { extractResidentEmails } from "../dist/src/services/briefing-emails.js";
import {
    hasConfiguredProjectStageOrder,
    initialProjectStages,
    normalizedProjectStages,
    projectStagesAfterBriefingSubmission,
    projectStagesForProposal
} from "../dist/src/models/projectStage.js";

test("fluxo exibe contrato concluído e inicia de fato no briefing", () => {
    const initial = initialProjectStages(false);
    assert.equal(initial.length, 8);
    assert.deepEqual(initial.map(stage => stage.key), [
        "contract",
        "briefing",
        "layout",
        "project-development",
        "survey",
        "budgets-definitions",
        "executive-project",
        "final-delivery"
    ]);
    assert.equal(initial[0].status, "completed");
    assert.equal(initial[1].status, "not-started");

    const submitted = normalizedProjectStages(undefined, true);
    assert.equal(submitted[0].status, "completed");
    assert.equal(submitted[1].status, "awaiting-approval");
    assert.ok(submitted.slice(2).every(stage => stage.status === "not-started"));
});

test("envio do briefing preserva a ordem configurada do cliente", () => {
    const configured = initialProjectStages(false).map((stage, index) => ({ ...stage, index }));
    const reordered = [
        configured[0], configured[1], configured[4], configured[2],
        configured[3], configured[5], configured[6], configured[7]
    ].map((stage, index) => ({ ...stage, index }));

    const submitted = projectStagesAfterBriefingSubmission(reordered);
    assert.equal(hasConfiguredProjectStageOrder(submitted), true);
    assert.deepEqual(submitted.map(stage => stage.key), reordered.map(stage => stage.key));
    assert.equal(submitted.find(stage => stage.key === "briefing")?.status, "awaiting-approval");
});

test("propostas respeitam a ordem personalizada para concluir etapas anteriores", () => {
    const ordered = [
        "contract", "briefing", "survey", "layout", "project-development",
        "budgets-definitions", "executive-project", "final-delivery"
    ].map((key, index) => ({ key, status: key === "contract" ? "completed" : "not-started", index }));

    const updated = projectStagesForProposal(ordered, true, "layout", "awaiting-approval");
    assert.equal(updated.find(stage => stage.key === "survey")?.status, "completed");
    assert.equal(updated.find(stage => stage.key === "layout")?.status, "awaiting-approval");
    assert.equal(updated.find(stage => stage.key === "project-development")?.status, "not-started");
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
    assert.equal(result.projectStages.length, 8);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].currentStageKey, "survey");
});

test("administrador define índices para uma ordem completa e preserva os status", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const updates = [];
    const repository = {
        async findByIdForAdmin() {
            return {
                _id: clientId,
                hasFilledBriefing: true,
                currentStageKey: "survey",
                projectStages: [
                    { key: "contract", status: "completed" },
                    { key: "briefing", status: "completed" },
                    { key: "survey", status: "in-progress" }
                ]
            };
        },
        async updateProjectStageState(id, currentStageKey, projectStages) {
            updates.push({ id, currentStageKey, projectStages });
            return { _id: id };
        }
    };
    const order = [
        "contract", "briefing", "survey", "layout", "project-development",
        "budgets-definitions", "executive-project", "final-delivery"
    ];
    const service = new UpdateClientProjectStageService(repository);
    const result = await service.updateOrder(clientId, order);

    assert.equal(result.currentStageKey, "survey");
    assert.deepEqual(result.projectStages.map(stage => stage.key), order);
    assert.deepEqual(result.projectStages.map(stage => stage.index), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(result.projectStages[2].status, "in-progress");
    assert.equal(hasConfiguredProjectStageOrder(result.projectStages), true);
    assert.equal(updates.length, 1);
});

test("ordem rejeita etapas ausentes, repetidas ou Briefing fora da primeira posição real", async () => {
    const service = new UpdateClientProjectStageService({});
    const clientId = "507f1f77bcf86cd799439011";

    await assert.rejects(
        () => service.updateOrder(clientId, ["contract", "briefing"]),
        error => error.status === 400
    );
    await assert.rejects(
        () => service.updateOrder(clientId, [
            "contract", "survey", "briefing", "layout", "project-development",
            "budgets-definitions", "executive-project", "final-delivery"
        ]),
        error => error.status === 400
    );
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

