import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { BriefingReportProcessor } from "../dist/src/application/briefing-report-processor.js";

test("processador monta e envia o PDF fora do processo HTTP", async () => {
    const clientId = new mongoose.Types.ObjectId();
    const calls = [];
    const clients = { async findById() { return { _id: clientId, name: "Cliente Teste", driveFolderId: "folder-1" }; } };
    const briefings = { async findReportSourceByClientId() { return { responses: {}, attachments: [] }; } };
    const storage = {
        async downloadReportImage() { throw new Error("não deveria baixar imagem"); },
        async uploadBriefingReport(folderId, name, pdf) { calls.push([folderId, name, pdf.toString()]); return { exists: true }; }
    };
    const renderer = async (_document, options) => {
        assert.equal(typeof options.temporaryDirectory, "string");
        return Buffer.from("pdf-test");
    };
    const processor = new BriefingReportProcessor(clients, briefings, storage, renderer);

    await processor.process(clientId.toString());
    assert.deepEqual(calls, [["folder-1", "Cliente Teste", "pdf-test"]]);
});
