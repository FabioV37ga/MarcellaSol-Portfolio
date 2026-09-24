import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientStagesApprovalsModule } from "../src/client/modules/system/client-stages-approvals.module.js";
import type { ClientProposalsGateway, ClientProjectResponse } from "../src/client/infrastructure/proposals.api.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";

async function stagesTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(await readFile(
        resolve("../dev/database/client-stages-approvals-view.json"),
        "utf8"
    )) as { view: string };
    const template = document.createElement("template");
    template.innerHTML = source.view;
    return template.content.firstElementChild as HTMLElement;
}

function project(): ClientProjectResponse {
    return {
        currentStageKey: "briefing",
        projectStages: [{ key: "briefing", status: "awaiting-approval" }],
        proposals: [{
            _id: "proposal-1",
            title: "Layout inicial",
            description: "Descrição",
            attachments: [],
            userComment: "",
            clientResponses: [],
            stageKey: "briefing",
            status: "sent",
            createdAt: "2026-09-24T10:00:00.000Z",
            updatedAt: "2026-09-24T10:00:00.000Z"
        }]
    };
}

function api(loadProposals: ClientProposalsGateway["loadProposals"]): ClientProposalsGateway {
    return {
        loadProposals,
        approveProposal: vi.fn(),
        beatProposal: vi.fn()
    };
}

describe("etapas e aprovações do cliente", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <nav><button id="client-nav-stages" type="button"></button></nav>
            <main class="page-content"></main>
        `;
    });

    it("carrega etapas e propostas e controla a navegação da tela", async () => {
        const navigate = vi.fn();
        const loadProposals = vi.fn().mockResolvedValue(project());
        const navigation = document.querySelector<HTMLElement>("#client-nav-stages")!;
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(),
            await stagesTemplate(),
            api(loadProposals),
            "client-token",
            navigate
        );

        await module.mount(navigation);

        expect(loadProposals).toHaveBeenCalledWith("client-token");
        expect(document.querySelector("[data-proposal-id='proposal-1']")).not.toBeNull();
        expect(document.querySelector("[data-stage-key='briefing']")?.getAttribute("data-status"))
            .toBe("awaiting-approval");
        document.querySelector<HTMLElement>("#client-stages-back")!.click();
        expect(navigate).toHaveBeenCalledWith("home");
        expect(navigation.classList.contains("desktop-nav-item-selected")).toBe(true);
    });

    it("ignora uma resposta antiga depois que a tela é descartada", async () => {
        let resolveProject!: (value: ClientProjectResponse) => void;
        const pending = new Promise<ClientProjectResponse>(resolve => { resolveProject = resolve; });
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(),
            await stagesTemplate(),
            api(vi.fn().mockReturnValue(pending)),
            "client-token",
            vi.fn()
        );

        const mounting = module.mount();
        module.dispose();
        resolveProject(project());
        await mounting;

        expect(document.querySelector("[data-proposal-id='proposal-1']")).toBeNull();
        expect(document.querySelector<HTMLElement>("#client-approvals-loading")?.hidden).toBe(false);
    });

    it("apresenta a falha de carregamento enquanto a tela permanece ativa", async () => {
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(),
            await stagesTemplate(),
            api(vi.fn().mockRejectedValue(new Error("Falha controlada"))),
            "client-token",
            vi.fn()
        );

        await module.mount();

        expect(document.querySelector("#client-approvals-feedback")?.textContent).toBe("Falha controlada");
        expect(document.querySelector<HTMLElement>("#client-approvals-loading")?.hidden).toBe(true);
    });
});
