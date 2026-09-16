import { describe, expect, it } from "vitest";
import { AdminBriefingInvestmentEditor } from "../src/admin/modules/admin-briefing-investment.editor.js";
import type { briefingInvestment } from "../src/admin/selectors/newClient/briefing.selector.js";
import type { BriefingDefinition } from "../src/shared/briefing/briefing.types.js";

function elements(): briefingInvestment {
    return {
        root: [],
        cancel: document.createElement("button"),
        confirm: document.createElement("button"),
        flexibility: document.createElement("input")
    };
}

describe("AdminBriefingInvestmentEditor", () => {
    it("restaura e sincroniza a flexibilidade do investimento", () => {
        const briefing: BriefingDefinition = { investmentFlexibility: true };
        const fields = elements();
        const editor = new AdminBriefingInvestmentEditor(briefing);

        editor.mount(fields);
        expect(fields.flexibility.checked).toBe(true);

        fields.flexibility.checked = false;
        fields.flexibility.dispatchEvent(new Event("change"));
        expect(briefing.investmentFlexibility).toBe(false);
    });

    it("assume ausência de flexibilidade quando o estado ainda não foi definido", () => {
        const briefing: BriefingDefinition = {};
        const fields = elements();
        new AdminBriefingInvestmentEditor(briefing).mount(fields);

        expect(fields.flexibility.checked).toBe(false);
        expect(briefing.investmentFlexibility).toBe(false);
    });
});
