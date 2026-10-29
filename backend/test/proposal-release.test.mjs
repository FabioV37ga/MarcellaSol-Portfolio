import assert from "node:assert/strict";
import test from "node:test";
import { ProposalReleaseService } from "../dist/src/application/proposal-release.service.js";
import { presentClientProposal } from "../dist/src/application/proposals/client-proposal.presenter.js";
import { ClientProposalService } from "../dist/src/application/client-proposal.service.js";

const now = new Date("2026-10-29T15:00:00.000Z");
const claimedProposal = {
    _id: { toString: () => "proposal-1" },
    userId: { toString: () => "client-1" },
    attachmentFolderId: "scheduled-folder",
    release: {
        recipients: ["one@example.com", "two@example.com"],
        notifiedRecipients: [],
        attempts: 1,
        claimId: "claim-1"
    }
};

test("liberação concede acessos sequencialmente, move a pasta e conclui o claim", async () => {
    const events = [];
    const repository = {
        async claimNextDueRelease() { return claimedProposal; },
        async markReleaseRecipientNotified(...args) { events.push(["notified", ...args]); },
        async markReleaseCompleted(...args) { events.push(["completed", ...args]); },
        async markReleaseFailed() { assert.fail("não deve registrar falha"); }
    };
    const service = new ProposalReleaseService(
        repository,
        { async findById() { return { driveFolderId: "client-folder" }; } },
        { async grantFolderReadAccess(folderId, email) { events.push(["permission", folderId, email]); return { created: true }; } },
        { async moveScheduledProposalToClient(folderId, clientFolderId) { events.push(["move", folderId, clientFolderId]); } },
        { now: () => now },
        { generate: () => "claim-1" }
    );

    assert.equal(await service.processNext(), true);
    assert.deepEqual(events, [
        ["permission", "scheduled-folder", "one@example.com"],
        ["notified", "proposal-1", "claim-1", "one@example.com"],
        ["permission", "scheduled-folder", "two@example.com"],
        ["notified", "proposal-1", "claim-1", "two@example.com"],
        ["move", "scheduled-folder", "client-folder"],
        ["completed", "proposal-1", "claim-1", now]
    ]);
});

test("falha do Drive agenda nova tentativa sem derrubar o ciclo automático", async () => {
    const failures = [];
    const service = new ProposalReleaseService(
        {
            async claimNextDueRelease() { return claimedProposal; },
            async markReleaseRecipientNotified() { assert.fail("não deve registrar destinatário"); },
            async markReleaseCompleted() { assert.fail("não deve concluir"); },
            async markReleaseFailed(...args) { failures.push(args); }
        },
        { async findById() { return { driveFolderId: "client-folder" }; } },
        { async grantFolderReadAccess() { throw new Error("Google indisponível"); } },
        { async moveScheduledProposalToClient() { assert.fail("não deve mover"); } },
        { now: () => now },
        { generate: () => "claim-1" }
    );

    assert.equal(await service.processNext(), true);
    assert.deepEqual(failures, [[
        "proposal-1",
        "claim-1",
        new Date("2026-10-29T15:01:00.000Z"),
        false,
        "DRIVE_RELEASE_FAILED"
    ]]);
});

test("presenter do cliente oculta links enquanto a proposta aguarda liberação", () => {
    const scheduledAt = new Date("2026-10-30T12:00:00.000Z");
    const presented = presentClientProposal({
        _id: "proposal-1",
        title: "Layout",
        description: "Descrição",
        attachments: ["https://drive.google.com/file/d/file-1/view"],
        userComment: "",
        status: "sent",
        release: {
            scheduledAt,
            status: "pending",
            recipients: ["client@example.com"],
            attempts: 0,
            nextAttemptAt: scheduledAt
        },
        createdAt: now,
        updatedAt: now
    });

    assert.deepEqual(presented.attachments, []);
    assert.equal(presented.attachmentCount, 1);
    assert.equal(presented.attachmentsAvailable, false);
    assert.equal(presented.releaseStatus, "pending");
});

test("criação agendada captura destinatários e envia arquivos à área privada", async () => {
    const stored = [];
    const uploads = [];
    const service = new ClientProposalService(
        {
            async findById() {
                return { _id: "507f1f77bcf86cd799439011", driveFolderId: "client-folder", hasFilledBriefing: true };
            },
            async updateProjectStageState() { return { _id: "507f1f77bcf86cd799439011" }; }
        },
        {
            async create(data) { stored.push(data); return data; },
            async delete() { return null; }
        },
        {
            async uploadProposal(...args) {
                uploads.push(args);
                return { folderId: "scheduled-folder", attachmentUrls: ["https://drive.google.com/file/d/file-1/view"] };
            },
            async setProposalFolderTrashed() { }
        },
        undefined,
        {
            async findReportSourceByClientId() {
                return { responses: [{ key: "adult-1-mail", value: " CLIENT@Example.com " }] };
            }
        },
        { now: () => now }
    );

    const releaseAt = "2026-10-30T15:00:00.000Z";
    await service.create(
        "507f1f77bcf86cd799439011",
        { title: "Layout", description: "Descrição", stageKey: "layout", releaseAt },
        [{ originalname: "layout.pdf", mimetype: "application/pdf", buffer: Buffer.from("pdf") }]
    );

    assert.deepEqual(uploads[0].at(-1), { scheduled: true });
    assert.equal(stored[0].release.scheduledAt.toISOString(), releaseAt);
    assert.deepEqual(stored[0].release.recipients, ["client@example.com"]);
    assert.deepEqual(stored[0].release.notifiedRecipients, []);
    assert.equal(stored[0].release.status, "pending");
});

test("cliente não pode decidir proposta antes da liberação dos anexos", async () => {
    const service = new ClientProposalService({}, {
        async findByIdAndUserId() {
            return { status: "sent", release: { status: "pending" } };
        }
    }, {});

    await assert.rejects(
        () => service.approve("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "Aprovado"),
        error => error.status === 409 && /ainda não foram liberados/.test(error.message)
    );
});
