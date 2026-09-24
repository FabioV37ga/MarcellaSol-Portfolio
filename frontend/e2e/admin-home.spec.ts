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
        databaseView("admin-new-client-view.json"),
        databaseView("client-management-view.json"),
        databaseView("client-financial-view.json"),
        databaseView("client-proposals-view.json")
    ]);
    await page.route("**/api/admin/login", route => route.fulfill({
        json: { token: "e2e-admin-token", name: "Administrador E2E" }
    }));
    await page.route("**/api/view/admin", route => route.fulfill({ json: { view: views } }));
    await page.route("**/api/admin/clients", route => route.fulfill({
        json: { clients, page: { limit: 20, hasMore: false } }
    }));
}

test("carrega páginas adicionais de clientes sem remover os itens visíveis", async ({ page }) => {
    await mockAdminApi(page);
    const requests: string[] = [];
    await page.route("**/api/admin/clients**", route => {
        const cursor = new URL(route.request().url()).searchParams.get("cursor");
        requests.push(cursor ?? "primeira");
        const client = cursor
            ? { id: "client-b", name: "Cliente B" }
            : { id: "client-a", name: "Cliente A" };
        return route.fulfill({ json: {
            clients: [{
                ...client, type: "residencial", hasFilledBriefing: false,
                currentStageKey: "briefing", currentStageStatus: "not-started"
            }],
            page: cursor
                ? { limit: 1, hasMore: false }
                : { limit: 1, hasMore: true, nextCursor: "cursor-2" }
        } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();

    await expect(page.locator("[data-client-id='client-a']")).toBeVisible();
    await page.locator("#client-list-load-more").click();
    await expect(page.locator("[data-client-id='client-b']")).toBeVisible();
    await expect(page.locator(".client-list-client")).toHaveCount(2);
    await expect(page.locator("#client-list-pagination-status")).toHaveText("2 clientes exibidos");
    await expect(page.locator("#client-list-load-more")).toBeHidden();
    expect(requests).toEqual(["primeira", "cursor-2"]);
});

test("carrega páginas adicionais de propostas no histórico administrativo", async ({ page }) => {
    const projectStages = ["contract", "briefing", "layout", "project-development", "survey", "budgets-definitions", "executive-project", "final-delivery"]
        .map((key, index) => ({ key, index, status: index === 0 ? "completed" : "not-started" }));
    const client = {
        id: "proposal-page-client", name: "Cliente Paginação", type: "residencial",
        hasFilledBriefing: false, currentStageKey: "briefing", currentStageStatus: "not-started",
        projectStages, hasProjectStageOrder: true
    };
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/proposal-page-client", route => route.fulfill({ json: { client } }));
    await page.route("**/api/admin/clients/proposal-page-client/briefing-report", route => route.fulfill({ json: { exists: false } }));
    await page.route("**/api/admin/clients/proposal-page-client/proposals**", route => {
        const cursor = new URL(route.request().url()).searchParams.get("cursor");
        const suffix = cursor ? "2" : "1";
        return route.fulfill({ json: {
            proposals: [{
                _id: `proposal-${suffix}`, userId: client.id, title: `Proposta ${suffix}`,
                description: "Descrição", attachments: ["https://example.com/proposta.pdf"],
                userComment: "", clientResponses: [], stageKey: "briefing", status: "sent",
                createdAt: "2026-09-24T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z"
            }],
            page: cursor
                ? { limit: 1, hasMore: false }
                : { limit: 1, hasMore: true, nextCursor: "cursor-2" }
        } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='proposal-page-client']").click();
    await page.locator("#client-management-proposals").click();

    await expect(page.locator("[data-proposal-id='proposal-1']")).toBeVisible();
    await page.locator("#proposals-load-more").click();
    await expect(page.locator("[data-proposal-id='proposal-2']")).toBeVisible();
    await expect(page.locator(".proposal-card")).toHaveCount(2);
    await expect(page.locator("#proposals-pagination-status")).toHaveText("2 propostas exibidas");
    await expect(page.locator("#proposals-load-more")).toBeHidden();
});

test("confirma alterações com cancelamento, falha, nova tentativa e etapa aguardando cliente", async ({ page }) => {
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
        client.projectStages[2].status = "awaiting-client";
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
    await expect(page.locator(".project-step[data-stage-key='layout']")).toHaveAttribute("data-status", "awaiting-client");
    expect(requests).toBe(2);
});

test("carrega os estilos componentizados da gestão de propostas", async ({ page }) => {
    const client = {
        id: "styled-client",
        name: "Cliente Estilos",
        hasFilledBriefing: true,
        type: "residencial",
        currentStageKey: "briefing",
        currentStageStatus: "awaiting-approval",
        projectStages: [
            { key: "contract", index: 0, status: "completed" },
            { key: "briefing", index: 1, status: "awaiting-approval" }
        ],
        hasProjectStageOrder: true
    };
    const proposal = {
        _id: "styled-proposal",
        userId: client.id,
        title: "Proposta estilizada",
        description: "Descrição da proposta",
        stageKey: "briefing",
        status: "sent",
        attachments: ["https://example.com/proposta.pdf"],
        clientResponses: [],
        createdAt: "2026-09-18",
        updatedAt: "2026-09-18"
    };
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/styled-client", route => route.fulfill({ json: { client } }));
    await page.route("**/api/admin/clients/styled-client/briefing-report", route => route.fulfill({ json: { exists: false } }));
    await page.route("**/api/admin/clients/styled-client/proposals", route => route.fulfill({ json: { proposals: [proposal] } }));

    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='styled-client']").click();
    await page.locator("#client-management-proposals").click();

    await expect(page.locator(".proposals-management-container")).toHaveCSS("font-family", /confort/);
    await expect(page.locator(".admin-project-progress")).toHaveCSS("border-radius", "12px");
    await expect(page.locator("[data-proposal-id='styled-proposal']")).toHaveCSS("border-radius", "10px");
    await page.locator("#new-proposal").click();
    await expect(page.locator("#proposal-dialog")).toBeVisible();
    await expect(page.locator("#proposal-dialog .proposal-dialog-form")).toHaveCSS("border-radius", "12px");
});

test("usa Voltar, preserva o rascunho e inicia novo cliente com campos vazios", async ({ page }) => {
    await mockAdminApi(page);
    let creationRequests = 0;
    await page.route("**/api/admin/user", route => {
        creationRequests++;
        if (creationRequests === 1) {
            return route.fulfill({ status: 500, json: { message: "Falha simulada ao criar cliente" } });
        }
        return route.fulfill({ status: 201, json: { client: { id: "created-client" } } });
    });
    const briefingViews = await Promise.all([
        databaseView("admin-briefing-home-view.json"),
        databaseView("admin-briefing-investment-view.json"),
        databaseView("admin-briefing-rooms-view.json"),
        databaseView("admin-briefing-added-room-view.json")
    ]);
    await page.route("**/api/view/admin/briefing", route => route.fulfill({ json: { views: briefingViews } }));
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("#add-client").click();
    const clientFields = page.locator(".add-client-form-input");
    await clientFields.nth(0).fill("Cliente E2E");
    await clientFields.nth(1).fill("cliente-e2e");
    await clientFields.nth(2).fill("senha-e2e");
    await page.locator("#add-client-confirm").click();

    const briefingBack = page.locator("#generate-briefing-cancel");
    await expect(briefingBack).toHaveText("Voltar");
    await briefingBack.click();
    await expect(page.locator(".add-client-window-header-text")).toContainText("Dados do cliente");
    const returnedClientFields = page.locator(".add-client-form-input");
    await expect(returnedClientFields.nth(0)).toHaveValue("Cliente E2E");
    await expect(returnedClientFields.nth(1)).toHaveValue("cliente-e2e");
    await expect(returnedClientFields.nth(2)).toHaveValue("senha-e2e");
    await page.locator("#add-client-confirm").click();
    const briefingFields = page.locator(".generate-briefing-form-input");
    await briefingFields.nth(0).selectOption("residencial");
    await briefingFields.nth(1).selectOption("apartamento");
    await briefingFields.nth(2).fill("Projeto E2E");
    await briefingFields.nth(3).fill("2");
    await briefingFields.nth(4).fill("0");
    await page.locator("#generate-briefing-confirm").click();
    await expect(page.locator("#briefing-investment-flexibility")).toBeVisible();
    await page.locator("#briefing-rooms-confirm").click();
    const roomsBack = page.locator("#briefing-rooms-cancel");
    await expect(roomsBack).toHaveText("Voltar");
    await page.locator(".briefing-room-add").click();
    const roomCard = page.locator(".briefing-room-card").first();
    await roomCard.locator("[contenteditable]").fill("Suíte E2E");
    await roomCard.locator(":scope > .briefing-room-select").selectOption("quarto");
    await roomsBack.click();
    await expect(page.locator("#briefing-investment-flexibility")).toBeVisible();
    await page.locator("#briefing-rooms-confirm").click();
    await expect(page.locator(".briefing-room-card [contenteditable]")).toHaveText("Suíte E2E");
    await page.locator("#briefing-rooms-confirm").click();
    await expect(page.locator(".briefing-finish-room-card")).toContainText("Suíte E2E");
    await expect(page.locator("#briefing-finish-back")).toHaveText("Voltar");
    await page.locator("#briefing-finish-back").click();
    await expect(page.locator("#briefing-rooms-cancel")).toBeVisible();
    await page.locator("#briefing-rooms-confirm").click();
    const finishConfirm = page.locator("#briefing-finish-confirm");
    await finishConfirm.click();
    await expect(finishConfirm).toBeEnabled();
    expect(creationRequests).toBe(1);
    await finishConfirm.click();
    await expect(page.locator("#add-client")).toBeVisible();
    expect(creationRequests).toBe(2);
    await page.locator("#add-client").click();
    await expect(page.locator(".add-client-form-input").nth(0)).toHaveValue("");
    await expect(page.locator(".add-client-form-input").nth(1)).toHaveValue("");
    await expect(page.locator(".add-client-form-input").nth(2)).toHaveValue("");
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

test("lista clientes com etapa, status e tipo fornecidos pela consulta administrativa", async ({ page }) => {
    await mockAdminApi(page, [{
        id: "client-list-contract",
        name: "Cliente Listagem",
        type: "Apartamento",
        hasFilledBriefing: true,
        currentStageKey: "survey",
        currentStageStatus: "in-progress"
    }]);
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();

    const row = page.locator("[data-client-id='client-list-contract']");
    await expect(row).toContainText("Cliente Listagem");
    await expect(row).toContainText("Apartamento");
    await expect(row).toContainText("Levantamento");
    await expect(row).toContainText("Em andamento");
    await expect(row).toHaveAttribute("data-stage-key", "survey");
    await expect(row).toHaveAttribute("data-stage-status", "in-progress");
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
    await expect(page.locator(".financial-management-container")).toHaveCSS("font-family", /confort/);
    await expect(page.locator(".financial-panel")).toHaveCSS("border-radius", "12px");
    expect(paymentsAuthorization).toBe("Bearer e2e-admin-token");
    await expect.poll(() => page.evaluate(() => history.state?.page)).toBe("client-financial");
    await page.locator("#financial-new-payment").click();
    await expect(page.locator("#financial-payment-dialog form")).toHaveCSS("border-radius", "12px");
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

test("financeiro acrescenta a próxima página sem remover pagamentos já exibidos", async ({ page }) => {
    const client = {
        id: "client-financial-pagination", name: "Cliente Paginação", type: "residencial",
        hasFilledBriefing: false, currentStageKey: "briefing", currentStageStatus: "not-started"
    };
    const payment = (id: string, title: string, createdAt: string) => ({
        id, version: 0, clientId: client.id, title,
        currency: "BRL", timeZone: "America/Sao_Paulo", status: "open",
        totalAmountCents: 100000, installmentCount: 1, firstDueDate: "2026-10-01",
        downPaymentPercentage: 0, discountPercentage: 0, interestPercentage: 0,
        discountAmountCents: 0, downPayment: { amountCents: 0, isPaid: false, status: "not-applicable" },
        financedAmountCents: 100000, interestAmountCents: 0, installmentTotalCents: 100000,
        finalAmountCents: 100000, paidAmountCents: 0, remainingAmountCents: 100000,
        financialTermsLocked: false,
        installments: [{ number: 1, amountCents: 100000, isPaid: false, status: "pending", dueDate: "2026-11-01" }],
        createdAt, updatedAt: createdAt
    });
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/client-financial-pagination", route => route.fulfill({
        json: { client: { ...client, projectStages: [], hasProjectStageOrder: false } }
    }));
    const cursors: string[] = [];
    await page.route("**/api/admin/clients/client-financial-pagination/payments**", route => {
        const cursor = new URL(route.request().url()).searchParams.get("cursor");
        cursors.push(cursor ?? "primeira");
        const secondPage = cursor === "financial-cursor-2";
        return route.fulfill({ json: {
            payments: [secondPage
                ? payment("payment-b", "Projeto B", "2026-09-01T10:00:00.000Z")
                : payment("payment-a", "Projeto A", "2026-09-02T10:00:00.000Z")],
            page: secondPage
                ? { limit: 1, hasMore: false }
                : { limit: 1, hasMore: true, nextCursor: "financial-cursor-2" },
            summary: { paymentCount: 2, totalAmountCents: 200000, paidAmountCents: 0, remainingAmountCents: 200000 }
        } });
    });

    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='client-financial-pagination']").click();
    await page.locator("#client-management-financial").click();

    await expect(page.locator("#financial-payments-list")).toContainText("Projeto A");
    await page.locator("#financial-load-more").click();
    await expect(page.locator("#financial-payments-list")).toContainText("Projeto A");
    await expect(page.locator("#financial-payments-list")).toContainText("Projeto B");
    await expect(page.locator("#financial-pagination-status")).toHaveText("2 de 2 pagamentos exibidos");
    await expect(page.locator("#financial-load-more")).toBeHidden();
    expect(cursors).toEqual(["primeira", "financial-cursor-2"]);
});

test("financeiro recarrega a cobrança após conflito com outra sessão", async ({ page }) => {
    const client = {
        id: "client-financial-conflict", name: "Cliente Concorrência", type: "residencial",
        hasFilledBriefing: false, currentStageKey: "briefing", currentStageStatus: "not-started"
    };
    const payment = (version: number, paid: boolean) => ({
        id: "payment-conflict", version, clientId: client.id, title: "Projeto concorrente",
        currency: "BRL", timeZone: "America/Sao_Paulo", status: paid ? "paid" : "open",
        totalAmountCents: 100000, installmentCount: 1, firstDueDate: "2026-10-01",
        downPaymentPercentage: 0, discountPercentage: 0, interestPercentage: 0,
        discountAmountCents: 0, downPayment: { amountCents: 0, isPaid: false, status: "not-applicable" },
        financedAmountCents: 100000, interestAmountCents: 0, installmentTotalCents: 100000,
        finalAmountCents: 100000, paidAmountCents: paid ? 100000 : 0,
        remainingAmountCents: paid ? 0 : 100000, financialTermsLocked: paid,
        installments: [{ number: 1, amountCents: 100000, isPaid: paid, status: paid ? "paid" : "pending", dueDate: "2026-10-01" }],
        createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z"
    });
    await mockAdminApi(page, [client]);
    await page.route("**/api/admin/clients/client-financial-conflict", route => route.fulfill({
        json: { client: { ...client, projectStages: [], hasProjectStageOrder: false } }
    }));
    let listRequests = 0;
    await page.route("**/api/admin/clients/client-financial-conflict/payments**", route => {
        if (route.request().method() === "PATCH") return route.fulfill({
            status: 409,
            json: {
                message: "Este pagamento foi alterado em outra sessão. Atualize a página e tente novamente",
                code: "PAYMENT_VERSION_CONFLICT"
            }
        });
        listRequests += 1;
        const current = payment(listRequests === 1 ? 1 : 2, listRequests > 1);
        return route.fulfill({ json: {
            payments: [current], page: { limit: 20, hasMore: false },
            summary: {
                paymentCount: 1, totalAmountCents: 100000,
                paidAmountCents: current.paidAmountCents, remainingAmountCents: current.remainingAmountCents
            }
        } });
    });
    await page.goto("/admin.html");
    await page.locator("#admin-login").fill("ADMIN-E2E");
    await page.locator("#admin-password").fill("senha-e2e");
    await page.locator("#admin-login-button").click();
    await page.locator(".page-content #client").click();
    await page.locator("[data-client-id='client-financial-conflict']").click();
    await page.locator("#client-management-financial").click();

    const installment = page.locator('input[aria-label="Parcela 1 pago"]');
    await expect(installment).not.toBeChecked();
    await installment.check();
    await expect(page.locator("#financial-feedback")).toContainText("Os dados atuais foram recarregados");
    await expect(page.locator('input[aria-label="Parcela 1 pago"]')).toBeChecked();
    expect(listRequests).toBe(2);
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
