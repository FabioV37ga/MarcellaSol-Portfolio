import { describe, expect, it } from "vitest";
import { clientApprovalItem } from "../src/client/templates/client-approval-item.template.js";

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
