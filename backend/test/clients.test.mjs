import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { DeleteClientService } from "../dist/src/application/delete-client.service.js";
import { ListClientsService } from "../dist/src/application/list-clients.service.js";

test("remoção de cliente exige correspondência exata do nome", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    let deleted = false;
    let touchedDrive = false;
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        { async deleteByIdAndName() { deleted = true; return true; } },
        { async setClientFolderTrashed() { touchedDrive = true; } }
    );

    for (const confirmation of ["Maria da Silva ", "maria da silva", "Maria  da Silva", undefined]) {
        await assert.rejects(() => service.execute(clientId, confirmation), error => error.status === 400);
    }
    assert.equal(deleted, false);
    assert.equal(touchedDrive, false);
});

test("remoção confirmada apaga os dados e envia a pasta do cliente à lixeira", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const driveUpdates = [];
    const deletions = [];
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        {
            async deleteByIdAndName(id, name) {
                deletions.push({ id, name });
                return true;
            }
        },
        {
            async setClientFolderTrashed(folderId, trashed) {
                driveUpdates.push({ folderId, trashed });
            }
        }
    );

    await service.execute(clientId, "Maria da Silva");
    assert.deepEqual(deletions, [{ id: clientId, name: "Maria da Silva" }]);
    assert.deepEqual(driveUpdates, [{ folderId: "pasta-1", trashed: true }]);
});

test("falha ao apagar dados restaura a pasta do cliente no Drive", async () => {
    const clientId = "507f1f77bcf86cd799439011";
    const driveUpdates = [];
    const service = new DeleteClientService(
        { async findByIdForAdmin() { return { _id: clientId, name: "Maria da Silva", driveFolderId: "pasta-1" }; } },
        { async deleteByIdAndName() { throw new Error("MongoDB indisponível"); } },
        {
            async setClientFolderTrashed(folderId, trashed) {
                driveUpdates.push({ folderId, trashed });
            }
        }
    );

    await assert.rejects(() => service.execute(clientId, "Maria da Silva"), /MongoDB indisponível/);
    assert.deepEqual(driveUpdates, [
        { folderId: "pasta-1", trashed: true },
        { folderId: "pasta-1", trashed: false }
    ]);
});

test("listagem administrativa retorna a etapa e o status atuais de cada cliente", async () => {
    const firstId = { toString: () => "507f1f77bcf86cd799439011" };
    const secondId = { toString: () => "507f1f77bcf86cd799439012" };
    const clients = {
        async findPageForAdmin() {
            return { records: [
                {
                    _id: firstId,
                    name: "Cliente A",
                    hasFilledBriefing: true,
                    currentStageKey: "survey",
                    projectStages: [
                        { key: "contract", status: "completed", index: 0 },
                        { key: "briefing", status: "completed", index: 1 },
                        { key: "survey", status: "in-progress", index: 2 },
                        { key: "layout", status: "not-started", index: 3 },
                        { key: "project-development", status: "not-started", index: 4 },
                        { key: "budgets-definitions", status: "not-started", index: 5 },
                        { key: "executive-project", status: "not-started", index: 6 },
                        { key: "final-delivery", status: "not-started", index: 7 }
                    ]
                },
                {
                    _id: secondId,
                    name: "Cliente B",
                    hasFilledBriefing: false,
                    projectStages: []
                }
            ], hasMore: false };
        }
    };
    const briefings = {
        async findByClientIds() {
            return [{
                clientId: firstId,
                briefingDefinition: { description: { type: "Apartamento" } }
            }];
        }
    };
    const service = new ListClientsService(clients, briefings);

    const result = await service.execute();
    assert.deepEqual(result.clients.map(client => ({
        name: client.name,
        type: client.type,
        stage: client.currentStageKey,
        status: client.currentStageStatus
    })), [
        { name: "Cliente A", type: "Apartamento", stage: "survey", status: "in-progress" },
        { name: "Cliente B", type: "Não informado", stage: "briefing", status: "not-started" }
    ]);
});

test("listagem administrativa depende somente das consultas mínimas de clientes e briefings", async () => {
    const clientId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
    const calls = [];
    const service = new ListClientsService(
        {
            async findPageForAdmin(options) {
                calls.push("clients:list");
                assert.equal(options.limit, 20);
                return { records: [{
                    _id: clientId,
                    name: "Cliente Consulta",
                    hasFilledBriefing: false,
                    currentStageKey: "briefing",
                    projectStages: []
                }], hasMore: false };
            },
            async findByIdForAdmin() {
                calls.push("clients:details");
                return null;
            }
        },
        {
            async findByClientIds(ids) {
                calls.push(`briefings:list:${ids.length}`);
                return [];
            },
            async findByClientIdForAdmin() {
                calls.push("briefings:details");
                return null;
            }
        }
    );

    const result = await service.execute();

    assert.equal(result.clients[0].name, "Cliente Consulta");
    assert.deepEqual(calls, ["clients:list", "briefings:list:1"]);
});

test("listagem administrativa expõe cursor opaco para a próxima página", async () => {
    const firstId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439019");
    const secondId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439018");
    const calls = [];
    const service = new ListClientsService(
        {
            async findPageForAdmin(options) {
                calls.push(options);
                return {
                    records: [{
                        _id: secondId,
                        name: "Cliente da página",
                        hasFilledBriefing: false,
                        currentStageKey: "briefing",
                        projectStages: []
                    }],
                    hasMore: true
                };
            }
        },
        { async findByClientIds() { return []; } }
    );
    const cursor = Buffer.from(JSON.stringify({ id: firstId.toString() })).toString("base64url");

    const result = await service.execute(cursor, "1");

    assert.equal(calls[0].limit, 1);
    assert.equal(calls[0].cursor.id.toString(), firstId.toString());
    assert.equal(result.page.hasMore, true);
    assert.deepEqual(
        JSON.parse(Buffer.from(result.page.nextCursor, "base64url").toString("utf8")),
        { id: secondId.toString() }
    );
});

test("listagem administrativa rejeita cursor e limite inválidos", async () => {
    const service = new ListClientsService(
        { async findPageForAdmin() { throw new Error("não deveria consultar"); } },
        { async findByClientIds() { return []; } }
    );

    await assert.rejects(() => service.execute("cursor-inválido"), error => error.status === 400);
    await assert.rejects(() => service.execute(undefined, "51"), error => error.status === 400);
});
