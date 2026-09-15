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
        databaseView("client-financial-view.json"),
        databaseView("client-proposals-view.json")
    ]);
    await page.route("**/api/admin/login", route => route.fulfill({
        json: { token: "e2e-admin-token", name: "Administrador E2E" }
    }));
    await page.route("**/api/view/admin", route => route.fulfill({ json: { view: views } }));
    await page.route("**/api/admin/clients", route => route.fulfill({ json: { clients } }));
}

test("confirma alterações com cancelamento, falha, nova tentativa e conclusão da etapa", async ({ page }) => {
    const client = { id: "changes-client", name: "Cliente Alterações", hasFilledBriefing: true,
        currentStageKey: "layout", currentStageStatus: "changes-requested", type: "residencial",
        projectStages: ["contract", "briefing", "layout", "project-development", "survey", "budgets-definitions", "executive-project", "final-delivery"]
            .map((key, index) => ({ key, index, status: key === "layout" ? "changes-requested" : index < 2 ? "completed" : "not-started" })),
        hasProjectStageOrder: true };
    let proposal = { _id: "changes-proposal", userId: client.id, title: "Layout", description: "Ajustes",
        stageKey: "layout", status: "beated", attachments: ["https://example.com/layout.pdf"], userComment: "Mover mesa",
        clientResponses: [{ decision: "beated", comment: "Mover mesa", attachments: [], createdAt: "2026-09-15" }],
        createdAt: "2026-09-15", updatedAt: "2026-09-15" };
    let requests = 0;
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/changes-client", route => route.fulfill({ json: { client } }));
    await page.route("**/api/admin/clients/changes-client/briefing-report", route => route.fulfill({ json: { exists: false } }));
    await page.route("**/api/admin/clients/changes-client/proposals", route => route.fulfill({ json: { proposals: [proposal] } }));
    await page.route("**/api/admin/clients/changes-client/proposals/changes-proposal/complete-changes", async route => {
        requests++;
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers().authorization).toBe("Bearer e2e-admin-token");
        if (requests === 1) return route.fulfill({ status: 500, json: { message: "Não foi possível confirmar as alterações." } });
        proposal = { ...proposal, status: "changes-completed" };
        client.projectStages[2].status = "completed";
        return route.fulfill({ json: { proposal, currentStageKey: "layout", projectStages: client.projectStages } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='changes-client']").click();
    await page.locator("#client-management-proposals").click();
    await expect(page.getByText("Reenviar ao cliente", { exact: true })).toHaveCount(0);
    await expect(page.locator("#open-proposals-list [data-proposal-id='changes-proposal']")).toBeVisible();
    await expect(page.locator("#closed-proposals-list [data-proposal-id='changes-proposal']")).toHaveCount(0);
    await page.locator(".proposal-confirm-changes").click();
    const dialog = page.locator("#proposal-changes-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Deseja alterar o status da proposta para 'Alterações concluídas'?");
    await page.locator("#proposal-changes-cancel").click();
    expect(requests).toBe(0);
    await page.locator(".proposal-confirm-changes").click();
    await page.locator("#proposal-changes-confirm").click();
    await expect(page.locator("#proposal-changes-feedback")).toHaveText("Não foi possível confirmar as alterações.");
    await page.locator("#proposal-changes-confirm").click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".proposal-status-changes-completed")).toHaveText("Alterações concluídas");
    await expect(page.locator("#open-proposals-list [data-proposal-id='changes-proposal']")).toHaveCount(0);
    await expect(page.locator("#closed-proposals-list [data-proposal-id='changes-proposal']")).toBeVisible();
    await expect(page.locator(".proposal-confirm-changes")).toHaveCount(0);
    await expect(page.locator(".proposal-client-response-history")).toContainText("Mover mesa");
    await expect(page.locator(".project-step[data-stage-key='layout']")).toHaveAttribute("data-status", "completed");
    expect(requests).toBe(2);
});

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
