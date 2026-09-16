import { describe, expect, it } from "vitest";
import { AdminBriefingDetailsEditor } from "../src/admin/modules/admin-briefing-details.editor.js";
import type { briefingHome } from "../src/admin/selectors/newClient/briefing.selector.js";
import type { BriefingDefinition } from "../src/shared/briefing/briefing.types.js";

function select(value: string): HTMLSelectElement {
    const element = document.createElement("select");
    element.add(new Option(value, value));
    return element;
}

function elements(): briefingHome {
    return {
        root: [],
        cancel: document.createElement("button"),
        confirm: document.createElement("button"),
        category: select("residencial"),
        type: select("apartamento"),
        name: document.createElement("input"),
        adultAmount: document.createElement("input"),
        childrenAmount: document.createElement("input")
    };
}

describe("AdminBriefingDetailsEditor", () => {
    it("restaura, sincroniza e valida os dados do briefing", () => {
        const briefing: BriefingDefinition = {
            description: {
                category: "residencial", type: "apartamento", name: "Projeto original",
                adultAmount: 2, childrenAmount: 1
            }
        };
        const fields = elements();
        const isValid = new AdminBriefingDetailsEditor(briefing).mount(fields);

        expect(fields.name.value).toBe("Projeto original");
        expect(fields.adultAmount.value).toBe("2");
        expect(isValid()).toBe(true);

        fields.name.value = "  Projeto atualizado  ";
        fields.adultAmount.value = "3";
        fields.childrenAmount.value = "0";
        fields.name.dispatchEvent(new Event("input"));
        expect(briefing.description).toEqual({
            category: "residencial", type: "apartamento", name: "Projeto atualizado",
            adultAmount: 3, childrenAmount: 0
        });
        expect(isValid()).toBe(true);
    });

    it("rejeita nome vazio e quantidades inválidas", () => {
        const briefing: BriefingDefinition = {};
        const fields = elements();
        const isValid = new AdminBriefingDetailsEditor(briefing).mount(fields);

        fields.name.value = " ";
        fields.adultAmount.value = "0";
        fields.childrenAmount.value = "1.5";
        expect(isValid()).toBe(false);
    });
});
