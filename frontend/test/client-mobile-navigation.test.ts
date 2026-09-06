import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientSystemModules } from "../src/client/modules/client-system.modules.js";
import type ClientBriefingController from "../src/client/controllers/briefing.controller.js";
import type { ClientSystemApi } from "../src/client/infrastructure/client-system.api.js";
import type { system } from "../src/client/templates/interface.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";

function baseTemplate(): HTMLElement {
    const template = document.createElement("section");
    template.innerHTML = `
        <section class="navigation-container">
            <div class="navigation-container-content">
                <div class="expand-menu"><i class="fa fa-bars"></i></div>
                <ul class="desktop-navigation">
                    <li id="client-nav-home" class="desktop-navigation-item desktop-nav-item-selected"></li>
                    <li id="client-nav-stages" class="desktop-navigation-item"></li>
                    <li id="client-nav-financial" class="desktop-navigation-item"></li>
                </ul>
                <div class="logout-desktop"></div>
            </div>
            <div id="client-mobile-navigation" class="mobile-navigation-menu" aria-hidden="true">
                <ul class="mobile-navigation">
                    <li class="mobile-navigation-item">Início</li>
                    <li class="mobile-navigation-item">Etapas</li>
                    <li class="mobile-navigation-item">Financeiro</li>
                </ul>
                <div class="logout-mobile">Sair</div>
            </div>
        </section>
        <main><section class="page-content"></section></main>
    `;
    return template;
}

describe("menu mobile do cliente", () => {
    beforeEach(() => {
        document.body.innerHTML = '<section class="client-login"></section>';
    });

    it("abre e encaminha para a rota correspondente uma única vez", () => {
        const navigate = vi.fn();
        const view = new ClientSystemView();
        const modules = new ClientSystemModules(
            view,
            { base: baseTemplate() } satisfies system,
            {} as ClientBriefingController,
            {} as ClientSystemApi,
            "test-token",
            navigate
        );

        modules.mount("base");
        const expandButton = document.querySelector<HTMLElement>(".expand-menu")!;
        const menu = document.querySelector<HTMLElement>("#client-mobile-navigation")!;
        const financial = menu.querySelectorAll<HTMLElement>(".mobile-navigation-item")[2];

        expandButton.click();
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(true);
        financial.click();

        expect(navigate).toHaveBeenCalledOnce();
        expect(navigate).toHaveBeenCalledWith("financial");
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(false);
    });
});
