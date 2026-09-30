import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminPortfolioModule } from "../src/admin/modules/portfolio/admin-portfolio.module.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";

async function portfolioTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(
        await readFile(path.resolve("../dev/database/admin-portfolio-view.json"), "utf8")
    ) as { view: string };
    const container = document.createElement("div");
    container.innerHTML = source.view;
    return container.firstElementChild as HTMLElement;
}

describe("AdminPortfolioModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button id="portfolio-navigation"></button>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
    });

    it("monta a view persistida com a ação de projetos e seleciona a navegação", async () => {
        const template = await portfolioTemplate();
        const navigation = document.querySelector<HTMLElement>("#portfolio-navigation")!;
        const module = new AdminPortfolioModule(
            new AdminSystemView(),
            template,
            () => navigation
        );

        module.mount();

        expect(document.querySelector(".portfolio-management-page")).not.toBe(template);
        expect(document.querySelector("#portfolio-management-title")?.textContent)
            .toBe("Gestão de Portfolio");
        const manageProjects = document.querySelector<HTMLButtonElement>(
            "#portfolio-manage-projects"
        );
        expect(manageProjects?.textContent).toBe("Gerenciar projetos");
        expect(manageProjects?.type).toBe("button");
        expect(navigation.classList.contains("desktop-nav-item-selected")).toBe(true);
    });
});
