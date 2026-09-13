import { describe, expect, it } from "vitest";
import {
    briefingButtonOptions,
    briefingDescriptiveOptions,
    briefingSimpleOptions
} from "../src/client/templates/briefing/components/briefing-options.template.js";

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

    it("gera opções simples sem introduzir uma classe visual", () => {
        const [option] = briefingSimpleOptions("radio", "identity", [
            { value: "natural", label: "Natural" }
        ]);

        expect(option.hasAttribute("class")).toBe(false);
        expect(option.querySelector("input")?.matches(
            'input[type="radio"][name="identity"][value="natural"]'
        )).toBe(true);
        expect(option.querySelector("span")?.textContent).toBe("Natural");
    });

    it("preserva título e descrição das opções descritivas", () => {
        const [option] = briefingDescriptiveOptions("radio", "maintenance", [{
            value: "baixa",
            label: "Baixa manutenção",
            description: "Praticidade no dia a dia"
        }]);

        expect(Array.from(option.children).map(child => child.tagName)).toEqual([
            "INPUT", "STRONG", "SPAN"
        ]);
        expect(option.querySelector("strong")?.textContent).toBe("Baixa manutenção");
        expect(option.querySelector("span")?.textContent).toBe("Praticidade no dia a dia");
    });
});
