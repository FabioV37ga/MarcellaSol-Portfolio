import { describe, expect, it } from "vitest";
import { clientApprovalItem } from "../src/client/templates/client-approval-item.template.js";
import { clientProposalItem } from "../src/admin/templates/client-proposal-item.template.js";

describe("liberação agendada de propostas", () => {
    it("mostra a proposta ao cliente sem links ou decisões antes da liberação", () => {
        const card = clientApprovalItem({
            _id: "proposal-1",
            title: "Layout",
            description: "Descrição",
            attachments: [],
            attachmentCount: 1,
            attachmentsAvailable: false,
            releaseAt: "2026-10-30T17:30:00.000Z",
            releaseStatus: "pending",
            userComment: "",
            clientResponses: [],
            status: "sent",
            createdAt: "2026-10-29T10:00:00.000Z",
            updatedAt: "2026-10-29T10:00:00.000Z"
        });

        expect(card.textContent).toContain("Anexos disponíveis em");
        expect(card.querySelector(".client-approval-attachment")).toBeNull();
        expect(card.querySelector(".client-approval-actions")).toBeNull();
    });
});

describe("espaçamento dos textos de propostas", () => {
    it("duplica somente quebras simples ao apresentar textos do banco", () => {
        const proposal = {
            _id: "proposal-1",
            title: "Layout",
            description: "Primeiro parágrafo\nSegundo parágrafo\n\nTerceiro parágrafo",
            attachments: [],
            userComment: "Primeira linha\nSegunda linha",
            clientResponses: [],
            status: "approved" as const,
            createdAt: "2026-10-29T10:00:00.000Z",
            updatedAt: "2026-10-29T10:00:00.000Z"
        };

        const adminCard = clientProposalItem(proposal);
        const clientCard = clientApprovalItem(proposal);

        expect(adminCard.querySelector(".proposal-description")?.textContent)
            .toBe("Primeiro parágrafo\n\nSegundo parágrafo\n\nTerceiro parágrafo");
        expect(clientCard.querySelector(".client-approval-description")?.textContent)
            .toBe("Primeiro parágrafo\n\nSegundo parágrafo\n\nTerceiro parágrafo");
        expect(adminCard.querySelector(".proposal-comment")?.textContent)
            .toContain("Primeira linha\n\nSegunda linha");
    });
});
