import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function databaseView(fileName: string): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(resolve("../dev/database", fileName), "utf8")) as Record<string, unknown>;
}

async function mockClient(page: Page, status = "sent"): Promise<void> {
    const views = await Promise.all([
        databaseView("client-base-view.json"),
        databaseView("client-home-view.json"),
        databaseView("client-stages-approvals-view.json"),
        databaseView("client-financial-client-view.json")
    ]);
    await page.route("**/api/client/login", route => route.fulfill({
        json: { token: "client-token", name: "Cliente Anexo", hasFilledBriefing: true }
    }));
    await page.route("**/api/view/client", route => route.fulfill({
        json: {
            view: views,
            clientObject: { id: "client-id", name: "Cliente Anexo", hasFilledBriefing: true }
        }
    }));
    await page.route("**/api/client/proposals", route => route.fulfill({
        json: {
            currentStageKey: "briefing",
            projectStages: [{ key: "contract", status: "completed" }, { key: "briefing", status: "awaiting-approval" }],
            proposals: [{
                _id: "proposal-id",
                title: "Proposta com anexo",
                description: "Descrição",
                attachments: ["https://drive.google.com/file/d/admin/view"],
                userComment: "",
                clientResponses: [],
                stageKey: "briefing",
                status,
                createdAt: "2026-09-14T10:00:00.000Z",
                updatedAt: "2026-09-14T10:00:00.000Z"
            }]
        }
    }));
}

test("cliente vê alterações concluídas sem nova aprovação", async ({ page }) => {
    await mockClient(page, "changes-completed");
    await page.goto("/cliente.html");
    await page.locator("#client-login").fill("CLIENTE");
    await page.locator("#client-password").fill("senha");
    await page.locator("#client-login-button").click();
    await page.locator("#client-stages-processes").click();
    await expect(page.locator(".client-approval-status-changes-completed")).toHaveText("Alterações concluídas");
    await expect(page.locator(".client-approval-approve")).toHaveCount(0);
    await expect(page.locator(".client-approval-reject")).toHaveCount(0);
});

test("cliente preserva comentário e anexo após falha e aprova na nova tentativa", async ({ page }) => {
    let multipartBody = "";
    let authorization = "";
    let attempts = 0;
    await mockClient(page);
    await page.route("**/api/client/proposals/proposal-id/approve", async route => {
        multipartBody = route.request().postDataBuffer()?.toString("utf8") ?? "";
        authorization = route.request().headers().authorization ?? "";
        attempts += 1;
        if (attempts === 1) {
            await route.fulfill({ status: 500, json: { message: "Erro interno ao registrar decisão." } });
            return;
        }
        await route.fulfill({
            json: {
                currentStageKey: "briefing",
                projectStages: [{ key: "contract", status: "completed" }, { key: "briefing", status: "approved" }],
                proposal: {
                    _id: "proposal-id",
                    title: "Proposta com anexo",
                    description: "Descrição",
                    attachments: ["https://drive.google.com/file/d/admin/view"],
                    userComment: "Aprovado com referência",
                    clientResponses: [{
                        decision: "approved",
                        comment: "Aprovado com referência",
                        attachments: ["https://drive.google.com/file/d/client/view"],
                        createdAt: "2026-09-14T11:00:00.000Z"
                    }],
                    stageKey: "briefing",
                    status: "approved",
                    createdAt: "2026-09-14T10:00:00.000Z",
                    updatedAt: "2026-09-14T11:00:00.000Z"
                }
            }
        });
    });

    await page.goto("/cliente.html");
    await page.locator("#client-login").fill("CLIENTE");
    await page.locator("#client-password").fill("senha");
    await page.locator("#client-login-button").click();
    await page.locator("#client-stages-processes").click();
    await page.locator(".client-approval-approve").click();
    await page.locator("#client-approval-approve-comment").fill("Aprovado com referência");
    await page.locator("#client-approval-approve-attachments").setInputFiles({
        name: "referencia-cliente.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("arquivo da resposta")
    });
    await page.locator("#client-approval-approve-confirm").click();

    await expect(page.locator("#client-approval-approve-feedback")).toHaveText("Erro interno ao registrar decisão.");
    await expect(page.locator("#client-approval-approve-comment")).toHaveValue("Aprovado com referência");
    await expect.poll(() => page.locator("#client-approval-approve-attachments").evaluate(
        (input: HTMLInputElement) => input.files?.[0]?.name
    )).toBe("referencia-cliente.pdf");
    await expect(page.locator("#client-approval-approve-confirm")).toBeEnabled();
    await page.locator("#client-approval-approve-confirm").click();

    await expect(page.locator(".client-approval-response-history")).toContainText("Aprovado com referência");
    await expect(page.locator(".client-approval-response-history a")).toHaveAttribute(
        "href", "https://drive.google.com/file/d/client/view"
    );
    expect(multipartBody).toContain("referencia-cliente.pdf");
    expect(multipartBody).toContain("Aprovado com referência");
    expect(authorization).toBe("Bearer client-token");
    expect(attempts).toBe(2);
});

test("cliente envia anexo ao solicitar alteração da proposta", async ({ page }) => {
    let multipartBody = "";
    await mockClient(page);
    await page.route("**/api/client/proposals/proposal-id/beat", async route => {
        multipartBody = route.request().postDataBuffer()?.toString("utf8") ?? "";
        await route.fulfill({
            json: {
                currentStageKey: "briefing",
                projectStages: [{ key: "contract", status: "completed" }, { key: "briefing", status: "changes-requested" }],
                proposal: {
                    _id: "proposal-id",
                    title: "Proposta com anexo",
                    description: "Descrição",
                    attachments: ["https://drive.google.com/file/d/admin/view"],
                    userComment: "Revisar conforme marcação",
                    clientResponses: [{
                        decision: "beated",
                        comment: "Revisar conforme marcação",
                        attachments: ["https://drive.google.com/file/d/client-change/view"],
                        createdAt: "2026-09-14T11:00:00.000Z"
                    }],
                    stageKey: "briefing",
                    status: "beated",
                    createdAt: "2026-09-14T10:00:00.000Z",
                    updatedAt: "2026-09-14T11:00:00.000Z"
                }
            }
        });
    });

    await page.goto("/cliente.html");
    await page.locator("#client-login").fill("CLIENTE");
    await page.locator("#client-password").fill("senha");
    await page.locator("#client-login-button").click();
    await page.locator("#client-stages-processes").click();
    await page.locator(".client-approval-reject").click();
    await page.locator("#client-approval-reject-comment").fill("Revisar conforme marcação");
    await page.locator("#client-approval-reject-attachments").setInputFiles({
        name: "marcacao-cliente.png",
        mimeType: "image/png",
        buffer: Buffer.from("imagem da alteração")
    });
    await page.locator("#client-approval-revision-confirmation").check();
    await page.locator("#client-approval-reject-confirm").click();

    await expect(page.locator(".client-approval-response-history")).toContainText("Revisar conforme marcação");
    await expect(page.locator(".client-approval-response-history a")).toHaveAttribute(
        "href", "https://drive.google.com/file/d/client-change/view"
    );
    expect(multipartBody).toContain("marcacao-cliente.png");
    expect(multipartBody).toContain("Revisar conforme marcação");
    expect(multipartBody).toContain("confirmRevisionRound");
});
