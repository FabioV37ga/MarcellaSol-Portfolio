import assert from "node:assert/strict";
import test from "node:test";
import { ClientBriefingReportService } from "../dist/src/application/client-briefing-report.service.js";

const CLIENT_A = "64b000000000000000000001";
const CLIENT_B = "64b000000000000000000002";

function createService(renderer) {
    const clientsById = new Map([
        [CLIENT_A, { _id: CLIENT_A, name: "Cliente A", driveFolderId: "folder-a" }],
        [CLIENT_B, { _id: CLIENT_B, name: "Cliente B", driveFolderId: "folder-b" }]
    ]);
    const uploads = [];
    const service = new ClientBriefingReportService(
        { async findById(id) { return clientsById.get(id) ?? null; } },
        { async findReportSourceByClientId() { return { responses: { sections: [], rooms: [] } }; } },
        {
            async getBriefingReportStatus() { return { exists: false }; },
            async uploadBriefingReport(folderId, clientName, pdf) {
                uploads.push({ folderId, clientName, pdf });
                return { exists: true, webViewLink: `https://drive.test/${folderId}` };
            }
        },
        { async prepare() { } },
        renderer
    );
    return { service, uploads };
}

test("serviço deduplica o cliente e mantém somente uma renderização ativa", async () => {
    let releaseFirst;
    const firstGate = new Promise(resolve => { releaseFirst = resolve; });
    const started = [];
    let active = 0;
    let maximumActive = 0;
    const { service, uploads } = createService({
        async render() {
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            started.push(started.length + 1);
            if (started.length === 1) await firstGate;
            active -= 1;
            return Buffer.from(`pdf-${started.length}`);
        }
    });

    const first = service.generate(CLIENT_A);
    const duplicate = service.generate(CLIENT_A);
    const secondClient = service.generate(CLIENT_B);

    assert.equal(first, duplicate);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(started.length, 1);

    releaseFirst();
    await Promise.all([first, duplicate, secondClient]);

    assert.equal(started.length, 2);
    assert.equal(maximumActive, 1);
    assert.deepEqual(uploads.map(upload => upload.folderId), ["folder-a", "folder-b"]);
});
