import assert from "node:assert/strict";
import test from "node:test";
import { BriefingReportWorker } from "../dist/src/application/briefing-report.worker.js";

test("worker processa um job por vez e registra sucesso", async () => {
    const calls = [];
    const jobs = {
        async claimNext(workerId) {
            calls.push(["claim", workerId]);
            return { _id: "job-1", clientId: "client-1" };
        },
        async succeed(id) { calls.push(["succeed", id]); },
        async fail() { throw new Error("não deveria falhar"); }
    };
    const processor = { async process(clientId) { calls.push(["process", clientId]); } };
    const worker = new BriefingReportWorker(jobs, processor, "worker-test", 1, 1000, console);

    assert.equal(await worker.processNext(), true);
    assert.deepEqual(calls, [
        ["claim", "worker-test"],
        ["process", "client-1"],
        ["succeed", "job-1"]
    ]);
});

test("worker sanitiza falhas inesperadas antes de persistir", async () => {
    const calls = [];
    const jobs = {
        async claimNext() { return { _id: "job-2", clientId: "client-2" }; },
        async succeed() { throw new Error("não deveria concluir"); },
        async fail(id, error) { calls.push([id, error]); }
    };
    const processor = { async process() { throw new Error("token secreto do provedor"); } };
    const silentLogger = { log() {}, error() {} };
    const worker = new BriefingReportWorker(jobs, processor, "worker-test", 1, 1000, silentLogger);

    assert.equal(await worker.processNext(), true);
    assert.deepEqual(calls, [["job-2", "Não foi possível gerar o relatório"]]);
});
