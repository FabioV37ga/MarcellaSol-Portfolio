import { describe, expect, it } from "vitest";
import { briefingVisualOptions } from "../src/client/templates/briefing/components/briefing-visual-options.template.js";

describe("briefingVisualOptions", () => {
    it("mantém a ordem estrutural do cartão com imagem, badge e título", () => {
        const [option] = briefingVisualOptions("checkbox", "style", [{
            value: "japandi",
            imageSrc: "/images/japandi.png",
            imageAlt: "Ambiente no estilo japandi",
            badge: "Opção C",
            title: "Japandi"
        }]);

        expect(Array.from(option.children).map(child => child.tagName)).toEqual([
            "INPUT", "IMG", "SPAN", "STRONG"
        ]);
        expect(option.querySelector("input")?.matches(
            'input[type="checkbox"][name="style"][value="japandi"]'
        )).toBe(true);
        const image = option.querySelector("img");
        expect(image?.className).toBe("briefing-option-image");
        expect(image?.getAttribute("src")).toBe("/images/japandi.png");
        expect(image?.alt).toBe("Ambiente no estilo japandi");
    });

    it("não cria textos vazios em amostras compostas somente por imagem", () => {
        const [option] = briefingVisualOptions("checkbox", "wood", [{
            value: "madeira-1",
            imageSrc: "/images/wood.png",
            imageAlt: "Amostra da madeira 1"
        }]);

        expect(option.querySelectorAll("span, strong")).toHaveLength(0);
    });

    it("permite preservar a classe específica dos ícones de elementos", () => {
        const [option] = briefingVisualOptions("checkbox", "elements", [{
            value: "ripado",
            imageSrc: "/images/ripado.png",
            imageAlt: "Ícone de ripado",
            imageClass: "briefing-element-icon",
            label: "Ripado"
        }]);

        expect(option.querySelector("img")?.className).toBe("briefing-element-icon");
        expect(option.querySelector("span")?.textContent).toBe("Ripado");
    });
});
