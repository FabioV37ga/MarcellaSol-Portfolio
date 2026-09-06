import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSystemModules } from "../src/admin/modules/admin-system.modules.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import type { AdminSystemApi, AdminSession } from "../src/admin/infrastructure/admin-system.api.js";
import type { ClientCreationFlow } from "../src/admin/modules/client-creation.flow.js";
import type { system } from "../src/admin/templates/interface.js";

function baseTemplate(): HTMLElement {
    const template = document.createElement("section");
    template.className = "app-container";
    template.innerHTML = `
        <section class="navigation-container">
            <div class="navigation-container-content">
                <div class="expand-menu"><i class="fa fa-bars"></i></div>
                <ul class="desktop-navigation">
                    <li class="desktop-navigation-item desktop-nav-item-selected">
                        <span class="desktop-navigation-item-icon"></span>
                        <span class="desktop-navigation-item-label"><span>Início</span></span>
                    </li>
                    <li class="desktop-navigation-item">
                        <span class="desktop-navigation-item-icon"></span>
                        <span class="desktop-navigation-item-label"><span>Portfolio</span></span>
                    </li>
                    <li class="desktop-navigation-item">
                        <span class="desktop-navigation-item-icon"></span>
                        <span class="desktop-navigation-item-label"><span>Clientes</span></span>
                    </li>
                </ul>
                <div class="logout-desktop"><i class="fa fa-sign-out"></i><span>Sair</span></div>
            </div>
        </section>
        <main><section class="page-content"></section></main>
    `;
    return template;
}

describe("menu mobile administrativo", () => {
    beforeEach(() => {
        document.body.innerHTML = '<section class="admin-login"></section>';
    });

    it("abre, navega e fecha como o menu da área do cliente", () => {
        const navigate = vi.fn();
        const models = { base: baseTemplate() } satisfies system;
        const view = new AdminSystemView();
        const modules = new AdminSystemModules(
            view,
            models,
            {} as ClientCreationFlow,
            {} as AdminSystemApi,
            { token: "test-token" } satisfies AdminSession,
            navigate
        );

        modules.mount("base");
        const expandButton = document.querySelector<HTMLElement>(".expand-menu")!;
        const menu = document.querySelector<HTMLElement>("#admin-mobile-navigation")!;
        const items = menu.querySelectorAll<HTMLElement>(".mobile-navigation-item");

        expect(items).toHaveLength(3);
        expect(menu.textContent).toContain("Portfolio");
        expandButton.click();
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(true);
        expect(expandButton.getAttribute("aria-expanded")).toBe("true");

        items[2].click();
        expect(navigate).toHaveBeenCalledWith("clients");
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(false);

        expandButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(true);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(menu.classList.contains("mobile-navigation-menu-open")).toBe(false);
    });
});
