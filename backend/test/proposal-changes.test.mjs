import assert from "node:assert/strict";
import test from "node:test";
import { ClientProposalService } from "../dist/src/application/client-proposal.service.js";
import { ClientProposalRepository } from "../dist/src/repositories/client-proposal.repository.js";
import model from "../dist/src/models/clientProposal.js";

const userId = "507f1f77bcf86cd799439011";
const proposalId = "507f1f77bcf86cd799439012";

test("conclusão só aceita propostas com alterações solicitadas", async () => {
    for (const status of ["sent", "resent", "approved", "changes-completed", "Cancelled"]) {
        const service = new ClientProposalService({}, {
            async findByIdAndUserId() { return { status }; },
            async completeChanges() { assert.fail("Não deve persistir"); }
        }, {});
        await assert.rejects(() => service.confirmChanges(userId, proposalId), error => error.status === 409);
    }
});

test("proposta concluída não aceita outra resposta do cliente", async () => {
    const service = new ClientProposalService({}, {
        async findByIdAndUserId() { return { status: "changes-completed" }; }
    }, {});
    await assert.rejects(() => service.approve(userId, proposalId, "Comentário"), error => error.status === 409);
    await assert.rejects(() => service.beat(userId, proposalId, "Comentário", true), error => error.status === 409);
});

test("falha na etapa restaura status sem sobrescrever histórico e anexos", async () => {
    const calls = [];
    const failure = new Error("Etapa indisponível");
    const service = new ClientProposalService({
        async findById() { return { hasFilledBriefing: true }; },
        async updateProjectStageState() { throw failure; }
    }, {
        async findByIdAndUserId() { return { status: "beated", stageKey: "layout", userComment: "Ajustar" }; },
        async completeChanges() { return { status: "changes-completed" }; },
        async restoreStatus(...args) { calls.push(args); }
    }, {});
    await assert.rejects(() => service.confirmChanges(userId, proposalId), error => error === failure);
    assert.deepEqual(calls, [[proposalId, userId, "changes-completed", "beated", "Ajustar"]]);
});

test("concorrência rejeita confirmação duplicada antes de atualizar etapa", async () => {
    const service = new ClientProposalService({
        async findById() { return { hasFilledBriefing: true }; },
        async updateProjectStageState() { assert.fail("Não deve atualizar etapa"); }
    }, {
        async findByIdAndUserId() { return { status: "beated", stageKey: "layout" }; },
        async completeChanges() { return null; }
    }, {});
    await assert.rejects(() => service.confirmChanges(userId, proposalId), error => error.status === 409);
});

test("repositório conclui somente status esperado e preserva demais campos", t => {
    const calls = [];
    t.mock.method(model, "findOneAndUpdate", (...args) => { calls.push(args); return "query"; });
    assert.equal(new ClientProposalRepository().completeChanges(proposalId, userId), "query");
    assert.deepEqual(calls, [[{ _id: proposalId, userId, status: "beated" },
        { $set: { status: "changes-completed" } }, { returnDocument: "after", runValidators: true }]]);
});
