import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientProposalsModule } from "../src/admin/modules/clients/admin-client-proposals.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import type { system } from "../src/admin/templates/interface.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import { projectStageLabels, type ProjectStage } from "../src/shared/project-stages.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "admin", subjectId: "admin-test" }));
}

const stages: ProjectStage[] = Object.keys(projectStageLabels).map((key, index) => ({
    key: key as ProjectStage["key"],
    status: index === 0 ? "completed" : index === 1 ? "awaiting-approval" : "not-started",
    index
}));

async function proposalsTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(
        await readFile(path.resolve("../dev/database/client-proposals-view.json"), "utf8")
    ) as { view: string };
    const container = document.createElement("div");
    container.innerHTML = source.view;
    return container.firstElementChild as HTMLElement;
}

describe("AdminClientProposalsModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
    });

    it("monta as propostas de um cliente fora do orquestrador administrativo", async () => {
        const template = await proposalsTemplate();
        const models = { clientProposals: template } satisfies system;
        const api = {
            loadClient: vi.fn().mockResolvedValue({
                id: "client-a",
                name: "Cliente A",
                type: "client",
                hasFilledBriefing: true,
                currentStageKey: "briefing",
                projectStages: stages,
                hasProjectStageOrder: false
            }),
            loadProposals: vi.fn().mockResolvedValue({
                proposals: [],
                page: { limit: 20, hasMore: false }
            })
        } as unknown as AdminSystemApi;
        const view = new AdminSystemView();
        const navButton = document.querySelector<HTMLElement>(".desktop-nav-item-selected")!;
        const module = new AdminClientProposalsModule(
            view,
            models,
            api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(),
            () => navButton,
            visualPersistence()
        );

        await module.mount("client-a");

        expect(api.loadClient).toHaveBeenCalledWith(
            { token: "test-token", subjectId: "admin-test" }, "client-a"
        );
        expect(api.loadProposals).toHaveBeenCalledWith(
            { token: "test-token", subjectId: "admin-test" }, "client-a", undefined, undefined
        );
        expect(document.querySelector("#proposals-title-name")?.textContent).toBe("Cliente A");
        expect(document.querySelector("#open-proposals-list")?.textContent).toContain("Nenhuma proposta aberta");
        expect(document.querySelector(".proposals-management-container")).not.toBe(template);
    });

    it("acrescenta a próxima página de propostas sem duplicar itens", async () => {
        const proposal = (id: string, title: string) => ({
            _id: id, userId: "client-a", title, description: "Descrição", attachments: [],
            userComment: "", clientResponses: [], status: "sent" as const,
            createdAt: "2026-09-24T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z"
        });
        const api = {
            loadClient: vi.fn().mockResolvedValue({
                id: "client-a", name: "Cliente A", type: "client", hasFilledBriefing: true,
                currentStageKey: "briefing", projectStages: stages, hasProjectStageOrder: false
            }),
            loadProposals: vi.fn()
                .mockResolvedValueOnce({
                    proposals: [proposal("proposal-a", "Proposta A")],
                    page: { limit: 1, hasMore: true, nextCursor: "cursor-2" }
                })
                .mockResolvedValueOnce({
                    proposals: [proposal("proposal-b", "Proposta B")],
                    page: { limit: 1, hasMore: false }
                })
        } as unknown as AdminSystemApi;
        const module = new AdminClientProposalsModule(
            new AdminSystemView(), { clientProposals: await proposalsTemplate() }, api,
            { token: "test-token", subjectId: "admin-test" }, vi.fn(), () => undefined,
            visualPersistence()
        );

        await module.mount("client-a");
        document.querySelector<HTMLButtonElement>("#proposals-load-more")!.click();

        await vi.waitFor(() => expect(document.querySelectorAll(".proposal-card")).toHaveLength(2));
        expect(api.loadProposals).toHaveBeenNthCalledWith(
            2, { token: "test-token", subjectId: "admin-test" }, "client-a", "cursor-2"
        );
        expect(document.querySelector("#proposals-pagination-status")?.textContent)
            .toBe("2 propostas exibidas");
    });

    it("mostra propostas em cache e preserva o card inalterado durante a revalidação", async () => {
        const proposal = (id: string, title: string) => ({
            _id: id, userId: "client-a", title, description: "Descrição", attachments: [],
            userComment: "", clientResponses: [], status: "sent" as const,
            createdAt: "2026-09-24T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z"
        });
        const cached = proposal("proposal-a", "Proposta A");
        const inserted = proposal("proposal-b", "Proposta B");
        let release!: (value: {
            proposals: typeof cached[];
            page: { limit: number; hasMore: boolean };
        }) => void;
        const pending = new Promise<{
            proposals: typeof cached[];
            page: { limit: number; hasMore: boolean };
        }>(resolve => { release = resolve; });
        const api = {
            loadClient: vi.fn().mockResolvedValue({
                id: "client-a", name: "Cliente A", type: "client", hasFilledBriefing: true,
                currentStageKey: "briefing", projectStages: stages, hasProjectStageOrder: false
            }),
            loadProposals: vi.fn()
                .mockResolvedValueOnce({ proposals: [cached], page: { limit: 20, hasMore: false } })
                .mockReturnValueOnce(pending)
        } as unknown as AdminSystemApi;
        const persistence = visualPersistence();
        const module = new AdminClientProposalsModule(
            new AdminSystemView(), { clientProposals: await proposalsTemplate() }, api,
            { token: "test-token", subjectId: "admin-test" }, vi.fn(), () => undefined,
            persistence
        );

        await module.mount("client-a");
        const secondMount = module.mount("client-a");
        await vi.waitFor(() => expect(document.querySelector("[data-proposal-id='proposal-a']")).not.toBeNull());
        const previewNode = document.querySelector<HTMLElement>("[data-proposal-id='proposal-a']")!;
        previewNode.dataset.reconciliationMarker = "preserved";

        release({ proposals: [inserted, cached], page: { limit: 50, hasMore: false } });
        await secondMount;
        await vi.waitFor(() => expect(document.querySelector("[data-proposal-id='proposal-b']")).not.toBeNull());

        expect(document.querySelector("[data-proposal-id='proposal-a']")).toBe(previewNode);
        expect(previewNode.dataset.reconciliationMarker).toBe("preserved");
        expect(api.loadProposals).toHaveBeenNthCalledWith(
            2, { token: "test-token", subjectId: "admin-test" }, "client-a", undefined, 50
        );
    });
});
