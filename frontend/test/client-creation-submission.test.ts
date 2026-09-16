import { describe, expect, it, vi } from "vitest";
import { ClientCreationSubmission } from "../src/admin/modules/client-creation/client-creation-submission.js";
import type { NewClientPayload } from "../src/shared/briefing/briefing.types.js";

const client: NewClientPayload = {
    login: "cliente", password: "senha", name: "Cliente", hasFilledBriefing: false, briefing: {}
};

function finishButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = "briefing-finish-confirm";
    document.body.append(button);
    return button;
}

describe("ClientCreationSubmission", () => {
    it("bloqueia envio duplicado e conclui a criação uma única vez", async () => {
        const button = finishButton();
        let resolveRequest!: () => void;
        const createClient = vi.fn(() => new Promise<void>(resolve => { resolveRequest = resolve; }));
        const onCreated = vi.fn();
        const submission = new ClientCreationSubmission({ createClient }, { token: "admin" }, onCreated);

        const first = submission.submit(client);
        const duplicate = submission.submit(client);
        expect(button.disabled).toBe(true);
        expect(createClient).toHaveBeenCalledOnce();
        resolveRequest();
        await Promise.all([first, duplicate]);
        expect(createClient).toHaveBeenCalledWith({ token: "admin" }, client);
        expect(onCreated).toHaveBeenCalledOnce();
        button.remove();
    });

    it("reativa a confirmação quando a criação falha", async () => {
        const button = finishButton();
        const error = new Error("falha simulada");
        const createClient = vi.fn().mockRejectedValue(error);
        const onCreated = vi.fn();
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        await new ClientCreationSubmission({ createClient }, { token: "admin" }, onCreated).submit(client);

        expect(button.disabled).toBe(false);
        expect(onCreated).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith("Erro ao criar cliente:", error);
        consoleError.mockRestore();
        button.remove();
    });
});
