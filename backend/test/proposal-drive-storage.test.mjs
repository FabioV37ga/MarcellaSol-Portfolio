import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveProposalStorage } from "../dist/src/services/proposal-drive.storage.js";

test("proposal storage organiza anexo do cliente na pasta da resposta", async () => {
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
                return { data: { id: "client-file-1" } };
            }
        }
    };
    const storage = new GoogleDriveProposalStorage(() => drive);
    const file = {
        originalname: "referência.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("arquivo")
    };

    const result = await storage.uploadProposal(
        "client-folder",
        "proposal-id",
        "Layout / Final",
        [file],
        "client",
        2
    );

    const folders = created.filter(call =>
        call.requestBody.mimeType === "application/vnd.google-apps.folder"
    );
    assert.deepEqual(folders.map(call => ({
        name: call.requestBody.name,
        parent: call.requestBody.parents[0]
    })), [
        { name: "propostas", parent: "client-folder" },
        { name: "Layout - Final-proposal-id", parent: "folder-propostas" },
        { name: "cliente", parent: "folder-Layout - Final-proposal-id" },
        { name: "resposta-2", parent: "folder-cliente" }
    ]);
    assert.equal(created.at(-1).requestBody.parents[0], "folder-resposta-2");
    assert.deepEqual(result, {
        folderId: "folder-Layout - Final-proposal-id",
        attachmentUrls: ["https://drive.google.com/file/d/client-file-1/view"]
    });
});

test("proposal storage rejeita URL externa antes de criar o cliente do Drive", async () => {
    let clientCreated = false;
    const storage = new GoogleDriveProposalStorage(() => {
        clientCreated = true;
        return {};
    });

    await assert.rejects(
        () => storage.setProposalAttachmentTrashed("https://example.com/file.pdf", true),
        /não pertence ao Google Drive/
    );
    assert.equal(clientCreated, false);
});
