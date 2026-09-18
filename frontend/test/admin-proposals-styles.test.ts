import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesDirectory = path.resolve("src/admin/styles/system");

describe("estilos administrativos de propostas", () => {
    it("mantém um ponto de entrada ordenado por responsabilidade", async () => {
        const entrypoint = await readFile(path.join(stylesDirectory, "client-proposals.css"), "utf8");

        expect(entrypoint.trim().split("\n")).toEqual([
            '@import url("./client-proposals/page.css");',
            '@import url("./client-proposals/project-stages.css");',
            '@import url("./client-proposals/proposal-list.css");',
            '@import url("./client-proposals/proposal-dialogs.css");',
            '@import url("./client-proposals/responsive.css");'
        ]);
    });

    it("distribui os seletores principais nos componentes correspondentes", async () => {
        const [page, stages, list, dialogs, responsive] = await Promise.all([
            "page.css",
            "project-stages.css",
            "proposal-list.css",
            "proposal-dialogs.css",
            "responsive.css"
        ].map(file => readFile(path.join(stylesDirectory, "client-proposals", file), "utf8")));

        expect(page).toContain(".proposals-management-container");
        expect(stages).toContain(".admin-project-progress");
        expect(list).toContain(".proposal-card");
        expect(dialogs).toContain(".proposal-dialog");
        expect(responsive).toContain("@media (min-width: 900px)");
        expect(responsive).toContain("@media (max-width: 560px)");
    });
});
