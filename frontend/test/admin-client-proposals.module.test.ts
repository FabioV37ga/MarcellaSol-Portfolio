import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientProposalsModule } from "../src/admin/modules/admin-client-proposals.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import type { system } from "../src/admin/templates/interface.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import { projectStageLabels, type ProjectStage } from "../src/shared/project-stages.js";

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
            loadProposals: vi.fn().mockResolvedValue([])
        } as unknown as AdminSystemApi;
        const view = new AdminSystemView();
        const navButton = document.querySelector<HTMLElement>(".desktop-nav-item-selected")!;
        const module = new AdminClientProposalsModule(
            view,
            models,
            api,
            { token: "test-token" },
            vi.fn(),
            () => navButton
        );

        await module.mount("client-a");

        expect(api.loadClient).toHaveBeenCalledWith({ token: "test-token" }, "client-a");
        expect(api.loadProposals).toHaveBeenCalledWith({ token: "test-token" }, "client-a");
        expect(document.querySelector("#proposals-title-name")?.textContent).toBe("Cliente A");
        expect(document.querySelector("#open-proposals-list")?.textContent).toContain("Nenhuma proposta aberta");
        expect(document.querySelector(".proposals-management-container")).not.toBe(template);
    });
});
