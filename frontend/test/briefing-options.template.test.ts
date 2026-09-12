import { describe, expect, it } from "vitest";
import { briefingButtonOptions } from "../src/client/templates/briefing/components/briefing-options.template.js";

describe("briefingButtonOptions", () => {
    it("preserva tipo, nome, valor, texto e classe estrutural das opções", () => {
        const options = briefingButtonOptions("checkbox", "priorities", [
            { value: "organizacao", label: "Organização" },
            { value: "iluminacao", label: "Iluminação" }
        ]);

        expect(options).toHaveLength(2);
        expect(options.every(option => option.matches("label.button-option"))).toBe(true);
        expect(options.map(option => option.querySelector("input")?.outerHTML)).toEqual([
            '<input type="checkbox" name="priorities" value="organizacao">',
            '<input type="checkbox" name="priorities" value="iluminacao">'
        ]);
        expect(options.map(option => option.querySelector("span")?.textContent)).toEqual([
            "Organização",
            "Iluminação"
        ]);
    });
});
