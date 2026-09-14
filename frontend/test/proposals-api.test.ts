import { describe, expect, it, vi } from "vitest";
import { AdminProposalsApi } from "../src/admin/infrastructure/proposals.api.js";
import { ClientProposalsApi } from "../src/client/infrastructure/proposals.api.js";
import type { HttpClient } from "../src/shared/http/http-client.js";

describe("APIs de propostas", () => {
    it("admin envia proposta multipart pelo transporte compartilhado", async () => {
        const request = vi.fn().mockResolvedValue({
            proposal: { _id: "proposal-1" }, currentStageKey: "layout", projectStages: []
        });
        const api = new AdminProposalsApi({ request } as unknown as HttpClient);
        const file = new File(["anexo"], "planta.pdf", { type: "application/pdf" });

        await api.createProposal({ token: "admin-token" }, "cliente/a", {
            title: "Layout", description: "Versão inicial", stageKey: "layout", attachments: [file]
        });

        expect(request).toHaveBeenCalledWith("/admin/clients/cliente%2Fa/proposals", expect.objectContaining({
            method: "POST", token: "admin-token", body: expect.any(FormData)
        }));
        const body = request.mock.calls[0][1].body as FormData;
        expect(body.get("attachments")).toBe(file);
    });

    it("cliente envia comentário, confirmação e anexos ao solicitar alteração", async () => {
        const result = { proposal: { _id: "proposal/1" }, currentStageKey: "layout", projectStages: [] };
        const request = vi.fn().mockResolvedValue(result);
        const api = new ClientProposalsApi({ request } as unknown as HttpClient);
        const file = new File(["referência"], "referencia.jpg", { type: "image/jpeg" });

        await expect(api.beatProposal("client-token", "proposal/1", "Alterar cor", true, [file])).resolves.toBe(result);
        expect(request).toHaveBeenCalledWith("/client/proposals/proposal%2F1/beat", expect.objectContaining({
            method: "POST", token: "client-token", body: expect.any(FormData)
        }));
        const body = request.mock.calls[0][1].body as FormData;
        expect(body.get("confirmRevisionRound")).toBe("true");
        expect(body.get("attachments")).toBeInstanceOf(File);
        expect((body.get("attachments") as File).name).toBe("referencia.jpg");
    });
});
