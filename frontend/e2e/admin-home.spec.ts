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
        databaseView("admin-clients-view.json"),
        databaseView("client-management-view.json"),
        databaseView("client-financial-view.json")
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

test("recupera falha ao gerar relatório de briefing e permite acessar após nova tentativa", async ({ page }) => {
    const client = {
        id: "client-management-e2e",
        name: "Cliente Gestão E2E",
        type: "residencial",
        hasFilledBriefing: true,
        currentStageKey: "briefing",
        currentStageStatus: "completed"
    };
    let reportGenerationRequests = 0;
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/client-management-e2e", route => route.fulfill({
        json: {
            client: {
                ...client,
                driveFolderUrl: "https://drive.google.com/drive/folders/client-management-e2e",
                projectStages: [],
                hasProjectStageOrder: false
            }
        }
    }));
    await page.route("**/api/admin/clients/client-management-e2e/briefing-report", route => {
        if (route.request().method() === "POST") {
            reportGenerationRequests += 1;
            if (reportGenerationRequests === 1) return route.fulfill({
                status: 500, json: { message: "Erro interno ao processar relatório do briefing" }
            });
            return route.fulfill({
                status: 201,
                json: {
                    exists: true,
                    folderUrl: "https://drive.google.com/drive/folders/client-management-e2e"
                }
            });
        }
        return route.fulfill({ json: { exists: false } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='client-management-e2e']").click();

    await expect(page.locator("#client-management-name")).toHaveText("Cliente Gestão E2E");
    await expect(page.locator("#client-management-drive")).toHaveAttribute(
        "href", "https://drive.google.com/drive/folders/client-management-e2e"
    );
    const report = page.locator("#client-management-briefing-report");
    await expect(report).toContainText("Gerar relatório");
    await report.click();
    await expect(report).toContainText("Tentar novamente");
    await expect(report).toBeEnabled();
    await report.click();
    await expect(report).toContainText("Acessar");
    expect(reportGenerationRequests).toBe(2);
});

test("financeiro preserva formulário após erro de prévia, permite nova tentativa e retorna à gestão", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    const client = {
        id: "client-financial-e2e",
        name: "Cliente Financeiro E2E",
        type: "residencial",
        hasFilledBriefing: false,
        currentStageKey: "briefing",
        currentStageStatus: "not-started"
    };
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/client-financial-e2e", route => route.fulfill({
        json: {
            client: {
                ...client,
                projectStages: [],
                hasProjectStageOrder: false
            }
        }
    }));
    let paymentsAuthorization = "";
    let previewFails = true;
    await page.route("**/api/admin/payments/preview", route => {
        if (previewFails) return route.fulfill({ status: 400, json: { message: "Dados do pagamento inválidos" } });
        return route.fulfill({ json: { preview: {
            downPaymentCents: 0,
            firstDueDate: "2026-10-01",
            installments: [{ amountCents: 120000, dueDate: "2026-10-01" }],
            finalAmountCents: 120000
        } } });
    });
    await page.route("**/api/admin/clients/client-financial-e2e/payments", route => {
        paymentsAuthorization = route.request().headers().authorization ?? "";
        return route.fulfill({ json: {
            payments: [],
            page: { limit: 20, hasMore: false },
            summary: {
                paymentCount: 0,
                totalAmountCents: 0,
                paidAmountCents: 0,
                remainingAmountCents: 0
            }
        } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='client-financial-e2e']").click();
    await page.locator("#client-management-financial").click();

    await expect(page.locator("#financial-title-name")).toHaveText("Cliente Financeiro E2E");
    await expect(page.locator("#financial-payments-list")).toContainText("Nenhum pagamento cadastrado");
    expect(paymentsAuthorization).toBe("Bearer e2e-admin-token");
    await expect.poll(() => page.evaluate(() => history.state?.page)).toBe("client-financial");
    await page.locator("#financial-new-payment").click();
    await page.locator("#financial-payment-title").fill("Projeto E2E");
    await page.locator("#financial-payment-total").fill("1000");
    await page.locator("#financial-payment-first-due-date").fill("2026-10-01");
    await page.locator("#financial-payment-count").fill("1");
    await expect(page.locator("#financial-payment-form-feedback")).toHaveText("Dados do pagamento inválidos");
    await expect(page.locator("#financial-payment-title")).toHaveValue("Projeto E2E");
    await expect(page.locator("#financial-payment-total")).toHaveValue("1000");
    previewFails = false;
    await page.locator("#financial-payment-total").fill("1200");
    await expect(page.locator("#financial-payment-form-feedback")).toBeEmpty();
    await expect(page.locator("#financial-preview-final")).toContainText("1.200,00");
    await page.locator("#financial-payment-cancel").click();
    await page.locator("#financial-back").click();
    await expect(page.locator("#client-management-name")).toHaveText("Cliente Financeiro E2E");
    await expect.poll(() => page.evaluate(() => history.state?.page)).toBe("client-management");
    expect(pageErrors).toEqual([]);
});

test("encerra a sessão administrativa usando o cliente HTTP compartilhado", async ({ page }) => {
    let authorization = "";
    await mockAdminApi(page);
    await page.route("**/api/admin/logout", async route => {
        authorization = route.request().headers().authorization ?? "";
        await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();

    await page.locator(".logout-desktop").click();

    await expect(page.locator(".admin-login")).toBeVisible();
    expect(authorization).toBe("Bearer e2e-admin-token");
});
