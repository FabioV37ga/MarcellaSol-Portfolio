import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientProposalResponseModule } from "../src/client/modules/client-proposal-response.module.js";
import type { ClientProposal, ClientProposalDecision } from "../src/client/infrastructure/proposals.api.js";
import { getStagesApprovalsElements } from "../src/client/selectors/stages-approvals.selector.js";

async function mountStagesView(): Promise<void> {
    const source = JSON.parse(await readFile(
        resolve("../dev/database/client-stages-approvals-view.json"),
        "utf8"
    )) as { view: string };
    document.body.innerHTML = source.view;
}

function proposal(title = "Proposta original"): ClientProposal {
    return {
        _id: "proposal-1",
        title,
        description: "Descrição",
        attachments: [],
        userComment: "",
        clientResponses: [],
        stageKey: "briefing",
        status: "sent",
        createdAt: "2026-09-24T10:00:00.000Z",
        updatedAt: "2026-09-24T10:00:00.000Z"
    };
}

describe("ciclo de vida das respostas às propostas", () => {
    beforeEach(async () => {
        await mountStagesView();
        HTMLDialogElement.prototype.showModal = function showModal(): void { this.open = true; };
        HTMLDialogElement.prototype.close = function close(): void {
            this.open = false;
            this.dispatchEvent(new Event("close"));
        };
    });

    it("ignora a conclusão de uma aprovação depois do descarte", async () => {
        let resolveDecision!: (value: ClientProposalDecision) => void;
        const decision = new Promise<ClientProposalDecision>(resolve => { resolveDecision = resolve; });
        const approveProposal = vi.fn().mockReturnValue(decision);
        const elements = getStagesApprovalsElements();
        const module = new ClientProposalResponseModule(
            elements,
            { approveProposal, beatProposal: vi.fn() },
            "client-token",
            document
        );
        module.mount();
        elements.list.append(module.render(proposal()));
        elements.list.querySelector<HTMLButtonElement>(".client-approval-approve")!.click();
        elements.approveComment.value = "Aprovado";
        elements.approveConfirm.click();

        module.dispose();
        resolveDecision({
            proposal: { ...proposal("Proposta atualizada"), status: "approved" },
            projectStages: [{ key: "briefing", status: "approved" }],
            currentStageKey: "briefing"
        });
        await decision;
        await Promise.resolve();

        expect(approveProposal).toHaveBeenCalledOnce();
        expect(elements.list.querySelector("h3")?.textContent).toBe("Proposta original");
        expect(elements.approveDialog.open).toBe(true);
    });

    it("remove os listeners dos diálogos ao descartar", () => {
        const elements = getStagesApprovalsElements();
        const module = new ClientProposalResponseModule(
            elements,
            { approveProposal: vi.fn(), beatProposal: vi.fn() },
            "client-token",
            document
        );
        module.mount();
        elements.list.append(module.render(proposal()));
        module.dispose();

        elements.list.querySelector<HTMLButtonElement>(".client-approval-approve")!.click();

        expect(elements.approveDialog.open).toBe(false);
    });
});
