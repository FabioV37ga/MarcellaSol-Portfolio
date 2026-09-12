import { expect, test, type Page } from "@playwright/test";

const client = {
    token: "e2e-client-token",
    name: "Cliente E2E",
    hasFilledBriefing: false
};

const briefingResponse = {
    view: [],
    clientObject: {
        id: "client-e2e",
        name: client.name,
        hasFilledBriefing: false
    },
    briefingObject: {
        id: "briefing-e2e",
        user: { name: client.name },
        description: {
            category: "residencial",
            type: "apartamento",
            name: "Projeto E2E",
            residentAmount: 1
        },
        investmentFlexibility: false,
        rooms: []
    }
};

async function mockClientApi(page: Page, response = briefingResponse): Promise<void> {
    await page.route("**/api/client/login", route => route.fulfill({ json: client }));
    await page.route("**/api/client/session", route => route.fulfill({
        json: { name: client.name, hasFilledBriefing: false }
    }));
    await page.route("**/api/view/client", route => route.fulfill({ json: response }));
}

async function storedFileCount(page: Page): Promise<number> {
    return page.evaluate(() => new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("marcella-sol-client-drafts", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction("files", "readonly");
            const count = transaction.objectStore("files").count();
            count.onerror = () => reject(count.error);
            count.onsuccess = () => resolve(count.result);
            transaction.oncomplete = () => database.close();
        };
    }));
}

async function loginWithRememberedSession(page: Page): Promise<void> {
    await page.locator("#client-login").fill("CLIENTE-E2E");
    await page.locator("#client-password").fill("senha-e2e");
    await page.locator("#remember-me").click();
    await page.locator("#client-login-button").click();
    await expect(page.locator(".form-page-container")).toBeVisible();
}

async function moveStoredDraftToLastPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        const key = "client-briefing-draft:v1:briefing-e2e";
        const draft = JSON.parse(localStorage.getItem(key) ?? "{}") as {
            version?: number;
            currentPage?: number;
            fields?: unknown[];
        };
        localStorage.setItem(key, JSON.stringify({
            version: draft.version ?? 1,
            currentPage: 10,
            fields: draft.fields ?? []
        }));
        window.history.replaceState({ scope: "client", page: "briefing", briefingStep: 10 }, "");
    });
}

test("restaura respostas e anexos do briefing depois de recarregar a página", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");

    await loginWithRememberedSession(page);
    await page.getByText("Começar briefing").click();

    const area = page.locator("#property-area");
    await area.fill("82.5");

    const attachment = page.locator("[data-briefing-page-key='about-property'] input[type='file']").first();
    await attachment.setInputFiles({
        name: "planta térrea versão final.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("arquivo de teste e2e")
    });

    const attachmentStatus = page.locator(
        "[data-briefing-page-key='about-property'] [data-briefing-file-cache-status]"
    ).first();
    await expect(attachmentStatus).toContainText("planta térrea versão final.pdf");
    await expect.poll(() => storedFileCount(page)).toBe(1);

    await page.reload();

    await expect(page.locator("#property-area")).toHaveValue("82.5");
    await expect(page.locator("[data-briefing-page-key='about-property']")).toBeVisible();
    await expect(page.locator(
        "[data-briefing-page-key='about-property'] [data-briefing-file-cache-status]"
    ).first()).toContainText("planta térrea versão final.pdf");
});

test("preserva o rascunho após falha e o limpa somente depois do envio bem-sucedido", async ({ page }) => {
    let attempts = 0;
    let successfulRequestBody = "";
    await mockClientApi(page);
    await page.route("**/api/client/briefing", async route => {
        attempts += 1;
        if (attempts === 1) {
            await route.fulfill({ status: 503, json: { message: "Falha E2E simulada" } });
            return;
        }

        successfulRequestBody = route.request().postDataBuffer()?.toString("utf8") ?? "";
        await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);
    await page.getByText("Começar briefing").click();

    const attachment = page.locator("[data-briefing-page-key='about-property'] input[type='file']").first();
    await attachment.setInputFiles({
        name: "planta térrea versão final.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("arquivo de submissão e2e")
    });
    await expect.poll(() => storedFileCount(page)).toBe(1);

    await moveStoredDraftToLastPage(page);
    await page.reload();

    const ending = page.locator("[data-briefing-page-key='ending']");
    await expect(ending).toBeVisible();
    await ending.locator(".briefing-input-medium").nth(0).fill("Mais conforto no dia a dia.");
    await ending.locator(".briefing-input-medium").nth(1).fill("Um projeto funcional e acolhedor.");
    await ending.locator("input[type='checkbox'][required]").check();

    page.once("dialog", dialog => dialog.accept());
    const submitButton = ending.getByRole("button", { name: "Enviar briefing" });
    await submitButton.click();

    await expect(submitButton).toBeEnabled();
    await expect.poll(() => page.evaluate(() => localStorage.getItem(
        "client-briefing-draft:v1:briefing-e2e"
    ))).not.toBeNull();
    await expect.poll(() => storedFileCount(page)).toBe(1);

    await submitButton.click();

    await expect(ending.locator(".briefing-success-message")).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem(
        "client-briefing-draft:v1:briefing-e2e"
    ))).toBeNull();
    await expect.poll(() => storedFileCount(page)).toBe(0);
    expect(attempts).toBe(2);
    expect(successfulRequestBody).toContain("briefing-attachment-0.pdf");
    expect(successfulRequestBody).toContain("planta térrea versão final.pdf");
});

test("compõe as páginas dos ambientes configurados na ordem do briefing", async ({ page }) => {
    const response = {
        ...briefingResponse,
        briefingObject: {
            ...briefingResponse.briefingObject,
            rooms: [
                { id: 7, index: 1, name: "Cozinha integrada", type: "cozinha", options: [] },
                { id: 3, index: 0, name: "Sala principal", type: "sala-estar", options: [] }
            ]
        }
    };
    await mockClientApi(page, response);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);

    const roomPages = page.locator("[data-briefing-room-id][data-briefing-room-page-kind]");
    await expect(roomPages).toHaveCount(4);
    await expect(roomPages.nth(0)).toHaveAttribute("data-briefing-page-key", "room-3");
    await expect(roomPages.nth(1)).toHaveAttribute("data-briefing-page-key", "room-3-considerations");
    await expect(roomPages.nth(2)).toHaveAttribute("data-briefing-page-key", "room-7");
    await expect(roomPages.nth(3)).toHaveAttribute("data-briefing-page-key", "room-7-considerations");
    await expect(page.locator("[data-briefing-page-key='room-7'] .briefing-title"))
        .toHaveText("Cozinha integrada");
});
