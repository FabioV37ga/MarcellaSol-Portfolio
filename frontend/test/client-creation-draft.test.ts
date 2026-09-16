import { describe, expect, it } from "vitest";
import { ClientCreationDraft } from "../src/admin/modules/client-creation-draft.js";

describe("ClientCreationDraft", () => {
    it("atualiza credenciais sem perder o briefing e monta o payload esperado", () => {
        const draft = new ClientCreationDraft({ name: "Cliente", login: "antigo", password: "senha" });
        const briefing = { investmentFlexibility: true, rooms: [] };
        draft.update({ name: "Cliente atualizado", login: "novo", password: "nova-senha" });

        expect(draft.getCredentials()).toEqual({
            name: "Cliente atualizado", login: "novo", password: "nova-senha"
        });
        expect(draft.toPayload(briefing)).toEqual({
            _id: "",
            name: "Cliente atualizado",
            login: "novo",
            password: "nova-senha",
            hasFilledBriefing: false,
            briefing
        });
    });
});
