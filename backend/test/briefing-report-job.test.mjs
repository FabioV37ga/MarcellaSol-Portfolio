import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { ClientBriefingReportService } from "../dist/src/application/client-briefing-report.service.js";

const clientId = new mongoose.Types.ObjectId();
const briefingVersion = new Date("2026-09-09T12:00:00.000Z");

function dependencies(job) {
    const calls = [];
    return {
        calls,
        clients: { async findById() { return { _id: clientId, name: "Cliente", driveFolderId: "folder-1" }; } },
        briefings: { async findReportSourceByClientId() { return { updatedAt: briefingVersion, submittedAt: briefingVersion }; } },
        storage: { async getBriefingReportStatus() { return { exists: false }; } },
        jobs: {
            async enqueue(receivedClientId, version) {
                calls.push(["enqueue", receivedClientId.toString(), version.toISOString()]);
                return job;
            },
            async requeueTerminal() { calls.push(["requeue"]); return { ...job, status: "queued" }; }
        }
    };
}

test("solicitação de relatório persiste job idempotente e retorna sem aguardar PDF", async () => {
    const job = { _id: "job-1", status: "queued", attempts: 0 };
    const deps = dependencies(job);
    const service = new ClientBriefingReportService(deps.clients, deps.briefings, deps.storage, deps.jobs);

    const result = await service.generate(clientId.toString());
    assert.deepEqual(result, { exists: false, job: { id: "job-1", status: "queued", attempts: 0 } });
    assert.deepEqual(deps.calls[0], ["enqueue", clientId.toString(), briefingVersion.toISOString()]);
    assert.equal(deps.calls.some(call => call[0] === "claim"), false);
});

test("nova solicitação recoloca job terminal na fila", async () => {
    const job = { _id: "job-2", status: "failed", attempts: 1, error: "falha anterior" };
    const deps = dependencies(job);
    const service = new ClientBriefingReportService(deps.clients, deps.briefings, deps.storage, deps.jobs);

    const result = await service.generate(clientId.toString());
    assert.equal(result.job.status, "queued");
    assert.equal(deps.calls.some(call => call[0] === "requeue"), true);
});
