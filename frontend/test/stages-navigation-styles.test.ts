import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("estilos de etapas e navegação", () => {
    it("separa etapas e aprovações por responsabilidade", async () => {
        const directory = path.resolve("src/client/styles/system");
        const entrypoint = await readFile(path.join(directory, "stages-approvals.css"), "utf8");
        expect(entrypoint.trim().split("\n")).toEqual([
            '@import url("./stages-approvals/page.css");',
            '@import url("./stages-approvals/project-progress.css");',
            '@import url("./stages-approvals/approval-cards.css");',
            '@import url("./stages-approvals/approval-dialogs.css");',
            '@import url("./stages-approvals/responses-actions.css");',
            '@import url("./stages-approvals/responsive.css");'
        ]);

        const [progress, cards, dialogs] = await Promise.all([
            "project-progress.css", "approval-cards.css", "approval-dialogs.css"
        ].map(file => readFile(path.join(directory, "stages-approvals", file), "utf8")));
        expect(progress).toContain(".project-progress-track");
        expect(cards).toContain(".client-approval-card");
        expect(dialogs).toContain(".client-approval-dialog");
    });

    it("reutiliza a navegação compartilhada com overrides somente no cliente", async () => {
        const [shared, admin, client] = await Promise.all([
            readFile(path.resolve("src/shared/styles/authenticated-navigation.css"), "utf8"),
            readFile(path.resolve("src/admin/styles/system/navigation.css"), "utf8"),
            readFile(path.resolve("src/client/styles/system/navigation.css"), "utf8")
        ]);

        expect(shared).toContain(".navigation-container");
        expect(shared).toContain(".mobile-navigation-menu");
        expect(shared).toContain(".desktop-navigation-item");
        expect(admin.trim()).toBe('@import url("../../../shared/styles/authenticated-navigation.css");');
        expect(client).toContain('@import url("../../../shared/styles/authenticated-navigation.css");');
        expect(client).toContain("@media (max-width: 899px)");
        expect(client).toContain("overflow-wrap: break-word");
    });
});
