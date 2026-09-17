import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveBriefingStorage } from "../dist/src/services/briefing-drive.storage.js";

test("briefing storage não inicializa o Drive quando não há arquivos", async () => {
    let clientCreated = false;
    const storage = new GoogleDriveBriefingStorage(() => {
        clientCreated = true;
        return {};
    });

    assert.deepEqual(await storage.uploadBriefing("CLIENTE", []), { folderId: "", files: [] });
    assert.equal(clientCreated, false);
});

test("briefing storage cria a hierarquia do cliente e devolve os metadados do upload", async () => {
    const previousRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "root-folder";
    const created = [];
    const drive = {
        files: {
            async list() {
                return { data: { files: [] } };
            },
            async create(options) {
                created.push(options);
                if (options.requestBody.mimeType === "application/vnd.google-apps.folder") {
                    return { data: { id: `folder-${options.requestBody.name}` } };
                }
                return {
                    data: {
                        id: "briefing-file",
                        name: options.requestBody.name,
                        mimeType: "application/pdf",
                        size: "7",
                        webViewLink: "https://drive.google.com/file/d/briefing-file/view"
                    }
                };
            }
        }
    };

    try {
        const storage = new GoogleDriveBriefingStorage(() => drive);
        const result = await storage.uploadBriefing(" Cliente / 01 ", [{
            originalname: "planta.pdf",
            mimetype: "application/pdf",
            size: 7,
            buffer: Buffer.from("planta")
        }]);

        assert.deepEqual(created.slice(0, 3).map(call => ({
            name: call.requestBody.name,
            parent: call.requestBody.parents[0]
        })), [
            { name: "clientes", parent: "root-folder" },
            { name: "Cliente - 01", parent: "folder-clientes" },
            { name: "documentos_briefing", parent: "folder-Cliente - 01" }
        ]);
        assert.equal(created.at(-1).requestBody.parents[0], "folder-documentos_briefing");
        assert.deepEqual(result, {
            folderId: "folder-documentos_briefing",
            files: [{
                id: "briefing-file",
                name: "planta.pdf",
                mimeType: "application/pdf",
                size: 7,
                webViewLink: "https://drive.google.com/file/d/briefing-file/view"
            }]
        });
    } finally {
        if (previousRoot === undefined) delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        else process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = previousRoot;
    }
});
