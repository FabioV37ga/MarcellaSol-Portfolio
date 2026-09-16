import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminClientManagementModule } from "../src/admin/modules/clients/admin-client-management.module.js";
import type { AdminSystemApi } from "../src/admin/infrastructure/admin-system.api.js";
import { AdminSystemView } from "../src/admin/views/adminSystem.view.js";

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
            { token: "test-token" },
            vi.fn(),
            vi.fn(),
            vi.fn(),
            () => document.querySelector<HTMLElement>("#clients-navigation")!
        );

        await module.mount("client-a");

        expect(document.querySelector("#client-management-name")?.textContent).toBe("Cliente A");
        expect(document.querySelector<HTMLAnchorElement>("#client-management-drive")?.href)
            .toBe("https://drive.google.com/folder/client-a");
        const report = document.querySelector<HTMLButtonElement>("#client-management-briefing-report")!;
        expect(report.textContent).toContain("Gerar relatório");
        report.click();
        await vi.waitFor(() => expect(report.textContent).toContain("Acessar"));
        expect(api.generateBriefingReport).toHaveBeenCalledWith({ token: "test-token" }, "client-a");
    });
});
