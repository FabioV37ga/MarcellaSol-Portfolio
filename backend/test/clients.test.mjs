import assert from "node:assert/strict";
import test from "node:test";
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
        async findAllForAdmin() {
            return [
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
            ];
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
    assert.deepEqual(result.map(client => ({
        name: client.name,
        type: client.type,
        stage: client.currentStageKey,
        status: client.currentStageStatus
    })), [
        { name: "Cliente A", type: "Apartamento", stage: "survey", status: "in-progress" },
        { name: "Cliente B", type: "Não informado", stage: "briefing", status: "not-started" }
    ]);
});
