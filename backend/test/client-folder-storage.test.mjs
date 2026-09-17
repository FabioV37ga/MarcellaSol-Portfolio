import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveClientFolderStorage } from "../dist/src/services/client-folder.storage.js";

test("client folder storage cria a pasta sanitizada dentro de clientes", async () => {
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
                return { data: { id: `folder-${options.requestBody.name}` } };
            }
        }
    };

    try {
        const storage = new GoogleDriveClientFolderStorage(() => drive);
        const folderId = await storage.createClientFolder(" Cliente / 01 ");

        assert.equal(folderId, "folder-Cliente - 01");
        assert.deepEqual(created.map(call => ({
            name: call.requestBody.name,
            parent: call.requestBody.parents[0]
        })), [
            { name: "clientes", parent: "root-folder" },
            { name: "Cliente - 01", parent: "folder-clientes" }
        ]);
    } finally {
        if (previousRoot === undefined) delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        else process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = previousRoot;
    }
});

test("client folder storage envia e restaura a pasta do cliente na lixeira", async () => {
    const updates = [];
    const drive = {
        files: {
            async update(options) {
                updates.push(options);
                return { data: { id: options.fileId } };
            }
        }
    };
    const storage = new GoogleDriveClientFolderStorage(() => drive);

    await storage.setClientFolderTrashed("client-folder", true);
    await storage.setClientFolderTrashed("client-folder", false);

    assert.deepEqual(updates.map(call => call.requestBody), [
        { trashed: true },
        { trashed: false }
    ]);
    assert.ok(updates.every(call => call.supportsAllDrives === true));
});
