import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientManagementModule } from "../src/admin/modules/clients/admin-client-management.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";
import { SessionVisualCache } from "../src/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "../src/shared/visual-persistence/visual-persistence.controller.js";

function visualPersistence(): VisualPersistenceController {
    return new VisualPersistenceController(new SessionVisualCache({ role: "admin", subjectId: "admin-test" }));
}

async function managementTemplate(): Promise<HTMLElement> {
    const source = JSON.parse(
        await readFile(path.resolve("../dev/database/client-management-view.json"), "utf8")
    ) as { view: string };
    const container = document.createElement("div");
    container.innerHTML = source.view;
    return container.firstElementChild as HTMLElement;
}

describe("AdminClientManagementModule", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <section class="admin-login"></section>
            <button id="clients-navigation"></button>
            <button class="desktop-nav-item-selected"></button>
            <main class="page-content"></main>
        `;
    });

    it("carrega o cliente e troca a ação de geração do relatório por acesso", async () => {
        const api = {
            loadClient: vi.fn().mockResolvedValue({
                id: "client-a",
                name: "Cliente A",
                hasFilledBriefing: true,
                driveFolderUrl: "https://drive.google.com/folder/client-a"
            }),
            loadBriefingReportStatus: vi.fn().mockResolvedValue({ exists: false }),
            generateBriefingReport: vi.fn().mockResolvedValue({
                exists: true,
                folderUrl: "https://drive.google.com/folder/client-a"
            })
        } as unknown as AdminSystemApi;
        const module = new AdminClientManagementModule(
            new AdminSystemView(),
            await managementTemplate(),
            api,
            { token: "test-token", subjectId: "admin-test" },
            vi.fn(),
            vi.fn(),
            vi.fn(),
            () => document.querySelector<HTMLElement>("#clients-navigation")!,
            visualPersistence()
        );

        await module.mount("client-a");

        expect(document.querySelector("#client-management-name")?.textContent).toBe("Cliente A");
        expect(document.querySelector<HTMLAnchorElement>("#client-management-drive")?.href)
            .toBe("https://drive.google.com/folder/client-a");
        const report = document.querySelector<HTMLButtonElement>("#client-management-briefing-report")!;
        expect(report.textContent).toContain("Gerar relatório");
        report.click();
        await vi.waitFor(() => expect(report.textContent).toContain("Acessar"));
        expect(api.generateBriefingReport).toHaveBeenCalledWith(
            { token: "test-token", subjectId: "admin-test" }, "client-a"
        );
    });

    it("apresenta os dados do cliente em cache enquanto revalida detalhes e relatório", async () => {
        const client = {
            id: "client-a", name: "Cliente em cache", type: "residencial",
            hasFilledBriefing: true, driveFolderUrl: "https://drive.google.com/folder/client-a",
            currentStageKey: "briefing" as const, currentStageStatus: "completed" as const,
            projectStages: [], hasProjectStageOrder: false
        };
        let release!: (value: typeof client) => void;
        const pending = new Promise<typeof client>(resolve => { release = resolve; });
        const api = {
            loadClient: vi.fn().mockResolvedValueOnce(client).mockReturnValueOnce(pending),
            loadBriefingReportStatus: vi.fn().mockResolvedValue({
                exists: true, folderUrl: "https://drive.google.com/folder/report"
            }),
            generateBriefingReport: vi.fn()
        } as unknown as AdminSystemApi;
        const module = new AdminClientManagementModule(
            new AdminSystemView(), await managementTemplate(), api,
            { token: "test-token", subjectId: "admin-test" }, vi.fn(), vi.fn(), vi.fn(), () => undefined,
            visualPersistence()
        );

        await module.mount("client-a");
        const secondMount = module.mount("client-a");
        await vi.waitFor(() => expect(document.querySelector("#client-management-name")?.textContent)
            .toBe("Cliente em cache"));
        expect(document.querySelector("#client-management-briefing-report")?.textContent).toContain("Acessar");
        expect(api.loadClient).toHaveBeenCalledTimes(2);

        release(client);
        await secondMount;

        expect(document.querySelector("#client-management-name")?.textContent).toBe("Cliente em cache");
        expect(api.loadBriefingReportStatus).toHaveBeenCalledTimes(2);
    });
});
