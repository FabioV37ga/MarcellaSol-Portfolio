import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveBriefingReportStorage } from "../dist/src/services/briefing-report-drive.storage.js";

test("report storage localiza o PDF existente e devolve a pasta", async () => {
    const queries = [];
    const drive = {
        files: {
            async list(options) {
                queries.push(options.q);
                if (options.q.includes("name = 'relatorios'")) {
                    return { data: { files: [{ id: "reports-folder" }] } };
                }
                return { data: { files: [{ id: "report-id", name: "relatorio-briefing-cliente.pdf" }] } };
            }
        }
    };
    const storage = new GoogleDriveBriefingReportStorage(() => drive);

    assert.deepEqual(await storage.getBriefingReportStatus("client-folder"), {
        exists: true,
        folderUrl: "https://drive.google.com/drive/folders/reports-folder"
    });
    assert.equal(queries.length, 2);
});

test("report storage rejeita arquivo que não é imagem antes de baixar seu conteúdo", async () => {
    let getCalls = 0;
    const drive = {
        files: {
            async get() {
                getCalls += 1;
                return { data: { mimeType: "application/pdf", size: "100" } };
            }
        }
    };
    const storage = new GoogleDriveBriefingReportStorage(() => drive);

    await assert.rejects(() => storage.downloadReportImage("file-id"), /não é uma imagem/);
    assert.equal(getCalls, 1);
});
