import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientStagesApprovalsModule } from "../src/client/modules/system/client-stages-approvals.module.js";
import type { ClientProposalsGateway, ClientProjectResponse } from "../src/client/infrastructure/proposals.api.js";
import { ClientSystemView } from "../src/client/views/clientSystem.view.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "client", subjectId: "client-test" }));
}

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
        }],
        page: { limit: 20, hasMore: false }
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
            navigate,
            visualPersistence()
        );

        await module.mount(navigation);

        expect(loadProposals).toHaveBeenCalledWith("client-token", undefined, undefined);
        expect(document.querySelector("[data-proposal-id='proposal-1']")).not.toBeNull();
        expect(document.querySelector("[data-stage-key='briefing']")?.getAttribute("data-status"))
            .toBe("awaiting-approval");
        document.querySelector<HTMLElement>("#client-stages-back")!.click();
        expect(navigate).toHaveBeenCalledWith("home");
        expect(navigation.classList.contains("desktop-nav-item-selected")).toBe(true);
    });

    it("acrescenta a próxima página de aprovações", async () => {
        const second = structuredClone(project());
        second.proposals[0]._id = "proposal-2";
        second.proposals[0].title = "Layout revisado";
        const first = project();
        first.page = { limit: 1, hasMore: true, nextCursor: "cursor-2" };
        second.page = { limit: 1, hasMore: false };
        const loadProposals = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(), await stagesTemplate(), api(loadProposals), "client-token", vi.fn(),
            visualPersistence()
        );

        await module.mount();
        document.querySelector<HTMLButtonElement>("#client-approvals-load-more")!.click();

        await vi.waitFor(() => expect(document.querySelectorAll("[data-proposal-id]")).toHaveLength(2));
        expect(loadProposals).toHaveBeenNthCalledWith(2, "client-token", "cursor-2");
        expect(document.querySelector("#client-approvals-pagination-status")?.textContent)
            .toBe("2 propostas exibidas");
    });

    it("ignora uma resposta antiga depois que a tela é descartada", async () => {
        let resolveProject!: (value: ClientProjectResponse) => void;
        const pending = new Promise<ClientProjectResponse>(resolve => { resolveProject = resolve; });
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(),
            await stagesTemplate(),
            api(vi.fn().mockReturnValue(pending)),
            "client-token",
            vi.fn(),
            visualPersistence()
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
            vi.fn(),
            visualPersistence()
        );

        await module.mount();

        expect(document.querySelector("#client-approvals-feedback")?.textContent).toBe("Falha controlada");
        expect(document.querySelector<HTMLElement>("#client-approvals-loading")?.hidden).toBe(true);
    });

    it("apresenta a prévia e preserva a proposta inalterada durante a revalidação", async () => {
        const initial = project();
        const fresh = structuredClone(initial);
        fresh.proposals.unshift({
            ...fresh.proposals[0],
            _id: "proposal-2",
            title: "Nova proposta"
        });
        let release!: (value: ClientProjectResponse) => void;
        const pending = new Promise<ClientProjectResponse>(resolve => { release = resolve; });
        const loadProposals = vi.fn()
            .mockResolvedValueOnce(initial)
            .mockReturnValueOnce(pending);
        const persistence = visualPersistence();
        const module = new ClientStagesApprovalsModule(
            new ClientSystemView(), await stagesTemplate(), api(loadProposals), "client-token", vi.fn(),
            persistence
        );

        await module.mount();
        module.dispose();
        const secondMount = module.mount();
        await vi.waitFor(() => expect(document.querySelector("[data-proposal-id='proposal-1']")).not.toBeNull());
        const previewNode = document.querySelector<HTMLElement>("[data-proposal-id='proposal-1']")!;
        previewNode.dataset.reconciliationMarker = "preserved";

        release(fresh);
        await secondMount;
        await vi.waitFor(() => expect(document.querySelector("[data-proposal-id='proposal-2']")).not.toBeNull());

        expect(document.querySelector("[data-proposal-id='proposal-1']")).toBe(previewNode);
        expect(previewNode.dataset.reconciliationMarker).toBe("preserved");
        expect(loadProposals).toHaveBeenNthCalledWith(2, "client-token", undefined, 50);
    });
});
