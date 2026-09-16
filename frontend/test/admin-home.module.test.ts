import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminHomeModule } from "../src/admin/modules/system/admin-home.module.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";

describe("AdminHomeModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button id="home-navigation"></button>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
    });

    it("monta a view existente e encaminha o acesso rápido de clientes", () => {
        const template = document.createElement("section");
        template.className = "accesses";
        template.innerHTML = '<a id="portfolio"></a><a id="client">Clientes</a>';
        const navigateToClients = vi.fn();
        const navigation = document.querySelector<HTMLElement>("#home-navigation")!;
        const module = new AdminHomeModule(
            new AdminSystemView(),
            template,
            navigateToClients,
            () => navigation
        );

        module.mount();
        document.querySelector<HTMLElement>("#client")!.click();

        expect(document.querySelector(".page-content > .accesses")).not.toBe(template);
        expect(navigation.classList.contains("desktop-nav-item-selected")).toBe(true);
        expect(navigateToClients).toHaveBeenCalledOnce();
    });
});
