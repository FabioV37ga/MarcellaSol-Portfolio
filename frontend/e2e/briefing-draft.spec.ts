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

async function mockClientApi(page: Page): Promise<void> {
    await page.route("**/api/client/login", route => route.fulfill({ json: client }));
    await page.route("**/api/client/session", route => route.fulfill({
        json: { name: client.name, hasFilledBriefing: false }
    }));
    await page.route("**/api/view/client", route => route.fulfill({ json: briefingResponse }));
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

test("restaura respostas e anexos do briefing depois de recarregar a página", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");

    await page.locator("#client-login").fill("CLIENTE-E2E");
    await page.locator("#client-password").fill("senha-e2e");
    await page.locator("#remember-me").click();
    await page.locator("#client-login-button").click();

    await expect(page.locator(".form-page-container")).toBeVisible();
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
