import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function databaseView(fileName: string): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(resolve("../dev/database", fileName), "utf8")) as Record<string, unknown>;
}

async function mockAdminApi(page: Page): Promise<void> {
    const views = await Promise.all([
        databaseView("admin-base-view.json"),
        databaseView("admin-home-view.json"),
        databaseView("admin-clients-view.json")
    ]);
    await page.route("**/api/admin/login", route => route.fulfill({
        json: { token: "e2e-admin-token", name: "Administrador E2E" }
    }));
    await page.route("**/api/view/admin", route => route.fulfill({ json: { view: views } }));
    await page.route("**/api/admin/clients", route => route.fulfill({ json: { clients: [] } }));
}

test("monta a home administrativa e navega pelo acesso rápido de clientes", async ({ page }) => {
    await mockAdminApi(page);
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();

    const home = page.locator(".page-content > .accesses");
    await expect(home).toBeVisible();
    await expect(home.getByText("Acesso rápido")).toBeVisible();
    await home.locator("#client").click();

    await expect(page.locator(".page-content > .client-section")).toBeVisible();
    await expect.poll(() => page.evaluate(() => history.state?.page)).toBe("clients");
});
