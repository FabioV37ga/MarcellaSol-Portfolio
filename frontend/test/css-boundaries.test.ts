import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("fronteiras globais dos estilos", () => {
    it("reutiliza um único reset nas três aplicações", async () => {
        const [shared, admin, client, portfolio] = await Promise.all([
            readFile(path.resolve("src/shared/styles/reset.css"), "utf8"),
            readFile(path.resolve("src/admin/styles/reset.css"), "utf8"),
            readFile(path.resolve("src/client/styles/reset.css"), "utf8"),
            readFile(path.resolve("src/portfolio/styles/reset.css"), "utf8")
        ]);

        expect(shared).toContain("HTML5 display-role reset");
        expect(admin.trim()).toBe('@import url("../../shared/styles/reset.css");');
        expect(client.trim()).toBe('@import url("../../shared/styles/reset.css");');
        expect(portfolio.trim()).toBe('@import url("../../shared/styles/reset.css");');
    });

    it("impede que briefing e financeiro alterem controles de outras telas", async () => {
        const [briefing, financial] = await Promise.all([
            readFile(path.resolve("src/client/styles/briefing/components/base.css"), "utf8"),
            readFile(path.resolve("src/admin/styles/system/client-financial/page.css"), "utf8")
        ]);

        expect(briefing).toContain("html:has(body.client-briefing-active)");
        expect(briefing).toContain(".briefing-app button");
        expect(briefing).toContain('.briefing-app input[type="file"]::file-selector-button');
        expect(briefing).not.toMatch(/^button,/m);
        expect(briefing).not.toMatch(/^html \{/m);
        expect(financial).not.toMatch(/^button:disabled/m);
        expect(financial).toContain(".financial-management-container button:disabled");
    });
});
