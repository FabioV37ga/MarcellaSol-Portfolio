import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientBriefingRouteModule } from "../src/client/modules/system/client-briefing-route.module.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";

describe("rota do briefing do cliente", () => {
    beforeEach(() => {
        document.body.innerHTML = '<section class="client-login"></section>';
    });

    it("monta e inicializa o briefing somente uma vez e encaminha a etapa", () => {
        const template = document.createElement("section");
        template.className = "briefing-app";
        const briefing = {
            getTemplate: vi.fn(() => template),
            initialize: vi.fn(),
            navigateToStep: vi.fn()
        };
        const module = new ClientBriefingRouteModule(new ClientSystemView(), briefing);

        module.mount(3);
        module.mount(4);

        expect(briefing.initialize).toHaveBeenCalledOnce();
        expect(briefing.navigateToStep.mock.calls).toEqual([[3], [4]]);
        expect(document.querySelectorAll(".briefing-app")).toHaveLength(1);
    });

    it("não navega para uma etapa inválida", () => {
        const briefing = {
            getTemplate: vi.fn(() => document.createElement("section")),
            initialize: vi.fn(),
            navigateToStep: vi.fn()
        };
        const module = new ClientBriefingRouteModule(new ClientSystemView(), briefing);

        module.mount(Number.NaN);

        expect(briefing.navigateToStep).not.toHaveBeenCalled();
    });
});
