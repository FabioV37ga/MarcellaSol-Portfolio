import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function databaseView(fileName: string): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(resolve("../dev/database", fileName), "utf8")) as Record<string, unknown>;
}

async function mockAdminApi(page: Page, clients: Record<string, unknown>[] = []): Promise<void> {
    const views = await Promise.all([
        databaseView("admin-base-view.json"),
        databaseView("admin-home-view.json"),
        databaseView("admin-clients-view.json")
    ]);
    await page.route("**/api/admin/login", route => route.fulfill({
        json: { token: "e2e-admin-token", name: "Administrador E2E" }
    }));
    await page.route("**/api/view/admin", route => route.fulfill({ json: { view: views } }));
    await page.route("**/api/admin/clients", route => route.fulfill({ json: { clients } }));
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

test("lista e exclui um cliente com confirmação nominal", async ({ page }) => {
    const client = {
        id: "client-e2e",
        name: "Cliente Exclusão E2E",
        type: "residencial",
        hasFilledBriefing: true,
        currentStageKey: "briefing",
        currentStageStatus: "completed"
    };
    let deletionBody = "";
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/client-e2e", async route => {
        deletionBody = route.request().postData() ?? "";
        await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();

    const row = page.locator("[data-client-id='client-e2e']");
    await expect(row).toContainText("Cliente Exclusão E2E");
    await row.getByRole("button", { name: "Apagar cliente Cliente Exclusão E2E" }).click();
    const confirmation = page.locator("#client-delete-confirmation");
    await confirmation.fill("Cliente Exclusão E2E");
    await expect(page.locator("#client-delete-confirm")).toBeEnabled();
    await page.locator("#client-delete-confirm").click();

    await expect(row).toHaveCount(0);
    expect(JSON.parse(deletionBody)).toEqual({ confirmationName: "Cliente Exclusão E2E" });
});
