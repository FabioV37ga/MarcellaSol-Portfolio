import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSystemRouter } from "../src/admin/navigation/admin-system.router.js";
import { ClientSystemRouter } from "../src/client/navigation/client-system.router.js";

describe("restauração da rota após recarregar com sessão salva", () => {
    beforeEach(() => {
        window.history.replaceState(null, "");
    });

    it("restaura o financeiro e o cliente selecionado para o administrador", () => {
        const render = vi.fn();
        window.history.replaceState({ scope: "admin", page: "client-financial", id: "cliente-123" }, "");

        new AdminSystemRouter(render).start(true);

        expect(render.mock.calls).toEqual([["base", undefined], ["client-financial", "cliente-123"]]);
        expect(window.history.state).toEqual({ scope: "admin", page: "client-financial", id: "cliente-123" });
    });

    it("não restaura uma tela administrativa de cliente sem identificador", () => {
        const render = vi.fn();
        window.history.replaceState({ scope: "admin", page: "client-financial" }, "");

        new AdminSystemRouter(render).start(true);

        expect(render.mock.calls).toEqual([["base", undefined], ["home", undefined]]);
    });

    it("restaura o financeiro do cliente que já concluiu o briefing", () => {
        const render = vi.fn();
        window.history.replaceState({ scope: "client", page: "financial" }, "");

        new ClientSystemRouter(render).start("base", true);

        expect(render.mock.calls).toEqual([["base", undefined], ["financial", undefined]]);
        expect(window.history.state).toEqual({ scope: "client", page: "financial" });
    });

    it("mantém cliente sem briefing dentro do fluxo obrigatório", () => {
        const render = vi.fn();
        window.history.replaceState({ scope: "client", page: "financial" }, "");

        new ClientSystemRouter(render).start("briefing", true);

        expect(render).toHaveBeenCalledOnce();
        expect(render).toHaveBeenCalledWith("briefing", undefined);
    });
});
