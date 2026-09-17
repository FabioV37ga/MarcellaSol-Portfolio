import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveFolderPermissionStorage } from "../dist/src/services/folder-permission.storage.js";

test("folder permission storage encontra uma permissão existente em páginas posteriores", async () => {
    const listCalls = [];
    let createCalls = 0;
    const drive = {
        permissions: {
            async list(options) {
                listCalls.push(options);
                if (!options.pageToken) {
                    return {
                        data: {
                            nextPageToken: "page-2",
                            permissions: [{ id: "deleted", emailAddress: "cliente@example.com", deleted: true }]
                        }
                    };
                }
                return {
                    data: {
                        permissions: [{ id: "permission-1", emailAddress: "CLIENTE@example.com" }]
                    }
                };
            },
            async create() {
                createCalls += 1;
                return { data: {} };
            }
        }
    };
    const storage = new GoogleDriveFolderPermissionStorage(() => drive);

    const result = await storage.grantFolderReadAccess("folder-1", " Cliente@Example.com ");

    assert.deepEqual(result, {
        email: "cliente@example.com",
        permissionId: "permission-1",
        created: false
    });
    assert.equal(listCalls.length, 2);
    assert.equal(listCalls[1].pageToken, "page-2");
    assert.equal(createCalls, 0);
});

test("folder permission storage cria acesso de leitura quando o e-mail ainda não possui permissão", async () => {
    const createCalls = [];
    const drive = {
        permissions: {
            async list() {
                return { data: { permissions: [] } };
            },
            async create(options) {
                createCalls.push(options);
                return { data: { id: "permission-2" } };
            }
        }
    };
    const storage = new GoogleDriveFolderPermissionStorage(() => drive);

    const result = await storage.grantFolderReadAccess("folder-2", " Pessoa@Example.com ");

    assert.deepEqual(result, {
        email: "pessoa@example.com",
        permissionId: "permission-2",
        created: true
    });
    assert.deepEqual(createCalls, [{
        fileId: "folder-2",
        requestBody: {
            type: "user",
            role: "reader",
            emailAddress: "pessoa@example.com"
        },
        sendNotificationEmail: true,
        supportsAllDrives: true,
        fields: "id,emailAddress"
    }]);
});
