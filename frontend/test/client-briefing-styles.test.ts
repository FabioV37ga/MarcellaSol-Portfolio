import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesDirectory = path.resolve("src/client/styles/briefing");

describe("estilos do briefing do cliente", () => {
    it("mantém o ponto de entrada na ordem original da cascata", async () => {
        const entrypoint = await readFile(path.join(stylesDirectory, "briefing.css"), "utf8");

        expect(entrypoint.trim().split("\n")).toEqual([
            '@import url("./components/base.css");',
            '@import url("./components/controls.css");',
            '@import url("./components/pages.css");',
            '@import url("./components/environments.css");',
            '@import url("./components/review.css");',
            '@import url("./components/responsive.css");'
        ]);
    });

    it("mantém cada grupo de seletores em sua responsabilidade", async () => {
        const [base, controls, pages, environments, review, responsive] = await Promise.all([
            "base.css",
            "controls.css",
            "pages.css",
            "environments.css",
            "review.css",
            "responsive.css"
        ].map(file => readFile(path.join(stylesDirectory, "components", file), "utf8")));

        expect(base).toContain(".form-page-container");
        expect(controls).toContain(".briefing-surface-finishes");
        expect(pages).toContain(".briefing-project-summary");
        expect(environments).toContain(".briefing-bedroom-essentials");
        expect(review).toContain(".briefing-summary");
        expect(review).toContain(".briefing-navigation");
        expect(responsive).toContain("@media (max-width: 760px)");
    });
});
