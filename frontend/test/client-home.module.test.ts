import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHomeModule } from "../src/client/modules/system/client-home.module.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";

function homeTemplate(): HTMLElement {
    const template = document.createElement("section");
    template.innerHTML = `
        <button id="client-stages-processes" type="button">Etapas</button>
        <button id="client-financial" type="button">Financeiro</button>
    `;
    return template;
}

describe("home do cliente", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <nav>
                <button id="client-nav-home" type="button"></button>
                <button class="desktop-nav-item-selected" type="button"></button>
            </nav>
            <main class="page-content"></main>
        `;
    });

    it("monta os acessos rápidos e encaminha cada ação para sua rota", () => {
        const navigate = vi.fn();
        const homeNavigation = document.querySelector<HTMLElement>("#client-nav-home")!;
        const module = new ClientHomeModule(new ClientSystemView(), homeTemplate(), navigate);

        module.mount(homeNavigation);
        document.querySelector<HTMLElement>("#client-stages-processes")!.click();
        document.querySelector<HTMLElement>("#client-financial")!.click();

        expect(navigate.mock.calls).toEqual([["stages-approvals"], ["financial"]]);
        expect(homeNavigation.classList.contains("desktop-nav-item-selected")).toBe(true);
    });

    it("falha de forma explícita quando a view persistida não possui um acesso obrigatório", () => {
        const template = homeTemplate();
        template.querySelector("#client-financial")?.remove();
        const module = new ClientHomeModule(new ClientSystemView(), template, vi.fn());

        expect(() => module.mount()).toThrow("Elemento #client-financial não encontrado na view home do cliente.");
    });
});
