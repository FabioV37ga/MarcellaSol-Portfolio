import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomViewLifecycle } from "../src/shared/views/dom-view-lifecycle.js";

describe("DomViewLifecycle", () => {
    beforeEach(() => {
        document.body.replaceChildren();
        document.body.innerHTML = '<main class="page-content"></main>';
    });

    it("cria uma nova árvore DOM a cada montagem", () => {
        const lifecycle = new DomViewLifecycle();
        const template = document.createElement("section");
        template.innerHTML = '<button type="button">Abrir</button>';

        const firstMount = lifecycle.render(template, ".page-content");
        firstMount.dataset.clientId = "client-a";
        const secondMount = lifecycle.render(template, ".page-content");

        expect(secondMount).not.toBe(firstMount);
        expect(secondMount).not.toBe(template);
        expect(secondMount.dataset.clientId).toBeUndefined();
        expect(template.isConnected).toBe(false);
        expect(firstMount.isConnected).toBe(false);
        expect(secondMount.isConnected).toBe(true);
    });

    it("não reaproveita listeners ao alternar entre clientes", () => {
        const lifecycle = new DomViewLifecycle();
        const template = document.createElement("section");
        template.innerHTML = '<button type="button">Salvar</button>';
        const savedClients: string[] = [];

        const mountClient = (clientId: string): HTMLButtonElement => {
            const mounted = lifecycle.render(template, ".page-content");
            const button = mounted.querySelector<HTMLButtonElement>("button")!;
            button.addEventListener("click", () => savedClients.push(clientId));
            return button;
        };

        const firstButton = mountClient("client-a");
        const secondButton = mountClient("client-b");
        secondButton.click();

        expect(savedClients).toEqual(["client-b"]);
        expect(firstButton).not.toBe(secondButton);
        expect(document.querySelector("button")).toBe(secondButton);
    });

    it("executa os descartes antes de substituir o conteúdo", () => {
        const lifecycle = new DomViewLifecycle();
        const firstTemplate = document.createElement("section");
        const secondTemplate = document.createElement("section");
        const dispose = vi.fn(() => {
            expect(firstTemplate.isConnected).toBe(false);
            expect(document.querySelector(".page-content")?.childElementCount).toBe(1);
        });

        const firstMount = lifecycle.render(firstTemplate, ".page-content");
        lifecycle.registerDisposer(() => {
            expect(firstMount.isConnected).toBe(true);
            dispose();
        });
        lifecycle.render(secondTemplate, ".page-content");

        expect(dispose).toHaveBeenCalledOnce();
        expect(document.querySelector(".page-content")?.firstElementChild).not.toBe(firstMount);
    });

    it("usa replaceChildren ao desmontar um contêiner exclusivo", () => {
        const lifecycle = new DomViewLifecycle();
        const container = document.querySelector<HTMLElement>(".page-content")!;
        const replaceChildren = vi.spyOn(container, "replaceChildren");

        lifecycle.render(document.createElement("section"), ".page-content");
        lifecycle.dispose();

        expect(replaceChildren).toHaveBeenLastCalledWith();
        expect(container.childElementCount).toBe(0);
    });
});
