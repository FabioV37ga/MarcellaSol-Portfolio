import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function databaseView(fileName: string): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(resolve("../dev/database", fileName), "utf8")) as Record<string, unknown>;
}

async function mockClient(page: Page): Promise<void> {
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
                status: "sent",
                createdAt: "2026-09-14T10:00:00.000Z",
                updatedAt: "2026-09-14T10:00:00.000Z"
            }]
        }
    }));
}

test("cliente envia anexo ao aprovar proposta e visualiza o histórico", async ({ page }) => {
    let multipartBody = "";
    let authorization = "";
    await mockClient(page);
    await page.route("**/api/client/proposals/proposal-id/approve", async route => {
        multipartBody = route.request().postDataBuffer()?.toString("utf8") ?? "";
        authorization = route.request().headers().authorization ?? "";
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

    await expect(page.locator(".client-approval-response-history")).toContainText("Aprovado com referência");
    await expect(page.locator(".client-approval-response-history a")).toHaveAttribute(
        "href", "https://drive.google.com/file/d/client/view"
    );
    expect(multipartBody).toContain("referencia-cliente.pdf");
    expect(multipartBody).toContain("Aprovado com referência");
    expect(authorization).toBe("Bearer client-token");
});
