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
            adultAmount: 2,
            childrenAmount: 1
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

async function moveStoredDraftToPage(page: Page, currentPage: number): Promise<void> {
    await page.evaluate(targetPage => {
        const key = "client-briefing-draft:v1:briefing-e2e";
        const draft = JSON.parse(localStorage.getItem(key) ?? "{}") as {
            version?: number;
            currentPage?: number;
            fields?: unknown[];
        };
        localStorage.setItem(key, JSON.stringify({
            version: draft.version ?? 1,
            currentPage: targetPage,
            fields: draft.fields ?? []
        }));
        window.history.replaceState({ scope: "client", page: "briefing", briefingStep: targetPage }, "");
    }, currentPage);
}

test("renderiza adultos e crianças com os campos de contato corretos", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);

    const about = page.locator("[data-briefing-page-key='about-property']");
    await expect(about.locator("[id^='adult-'][id$='-name']")).toHaveCount(2);
    await expect(about.locator("[id^='adult-'][id$='-height']")).toHaveCount(2);
    await expect(about.locator("[id^='adult-'][id$='-birth-date']")).toHaveCount(2);
    await expect(about.locator("[id^='adult-'][id$='-phone']")).toHaveCount(2);
    await expect(about.locator("[id^='adult-'][id$='-mail']")).toHaveCount(2);
    await expect(about.locator("[id^='child-'][id$='-name']")).toHaveCount(1);
    await expect(about.locator("[id^='child-'][id$='-height']")).toHaveCount(1);
    await expect(about.locator("[id^='child-'][id$='-birth-date']")).toHaveCount(1);
    await expect(about.locator("[id^='child-'][id$='-phone'], [id^='child-'][id$='-mail']"))
        .toHaveCount(0);
});

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

    await moveStoredDraftToPage(page, 10);
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

test("renderiza e permite selecionar as opções componentizadas de investimento", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);
    await moveStoredDraftToPage(page, 4);
    await page.reload();

    const investment = page.locator("[data-briefing-page-key='investment']");
    await expect(investment).toBeVisible();
    await expect(investment.locator("input[name='investment-range']")).toHaveCount(4);
    await expect(investment.locator("input[name='investment-includes']")).toHaveCount(11);

    await investment.getByText("R$ 250 a R$ 500 mil", { exact: true }).click();
    await investment.getByText("Marcenaria", { exact: true }).click();

    await expect(investment.locator("input[name='investment-range'][value='250-500-mil']")).toBeChecked();
    await expect(investment.locator("input[name='investment-includes'][value='marcenaria']")).toBeChecked();
});

test("mantém opções simples e limite de seleção nas preferências de atmosfera", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);
    await moveStoredDraftToPage(page, 5);
    await page.reload();

    const preferences = page.locator("[data-briefing-page-key='preferences-atmosphere']");
    const attention = preferences.locator("input[name='form-input-66']");
    const adjectives = preferences.locator("input[name='form-input-67']");
    await expect(preferences).toBeVisible();
    await expect(attention).toHaveCount(12);
    await expect(adjectives).toHaveCount(15);

    for (const value of ["cores", "materiais", "iluminacao", "texturas", "mobiliario"]) {
        await preferences.locator(`input[name='form-input-66'][value='${value}']`).check();
    }

    await expect(preferences.locator("input[name='form-input-66'][value='natureza']")).toBeDisabled();
    await expect(preferences.locator("input[name='form-input-66'][value='cores']")).toBeChecked();
});

test("renderiza cartões visuais e respeita os limites de cores e madeiras", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);
    await moveStoredDraftToPage(page, 6);
    await page.reload();

    const preferences = page.locator("[data-briefing-page-key='preferences-colors']");
    const palettes = preferences.locator("input[name='form-input-65']");
    const woods = preferences.locator("input[name='form-input-68']");
    await expect(preferences).toBeVisible();
    await expect(palettes).toHaveCount(5);
    await expect(woods).toHaveCount(8);
    await expect(preferences.locator("input[name='form-input-69']")).toHaveCount(4);
    await expect(palettes.first().locator("xpath=following-sibling::img")).toHaveAttribute(
        "alt", "Paleta de cores neutras quentes"
    );

    await preferences.locator("input[name='form-input-65'][value='neutros-quentes']").check();
    await preferences.locator("input[name='form-input-65'][value='cores-suaves']").check();
    await expect(preferences.locator("input[name='form-input-65'][value='cores-profundas']"))
        .toBeDisabled();

    await preferences.locator("input[name='form-input-68'][value='madeira-1']").check();
    await preferences.locator("input[name='form-input-68'][value='madeira-10']").check();
    await expect(preferences.locator("input[name='form-input-68'][value='madeira-2']")).toBeDisabled();
});

test("renderiza elementos e opções descritivas de manutenção", async ({ page }) => {
    await mockClientApi(page);
    await page.goto("/cliente.html");
    await loginWithRememberedSession(page);
    await moveStoredDraftToPage(page, 7);
    await page.reload();

    const preferences = page.locator("[data-briefing-page-key='preferences-materials']");
    const elements = preferences.locator("input[name='form-input-70']");
    const maintenance = preferences.locator("input[name='form-input-73']");
    await expect(preferences).toBeVisible();
    await expect(elements).toHaveCount(8);
    await expect(maintenance).toHaveCount(3);
    await expect(preferences.locator(".briefing-element-icon")).toHaveCount(8);
    await expect(maintenance.nth(1).locator("xpath=following-sibling::strong"))
        .toHaveText("Manutenção moderada");
    await expect(maintenance.nth(1).locator("xpath=following-sibling::span"))
        .toHaveText("Equilíbrio entre beleza e cuidado");

    await preferences.locator("input[name='form-input-70'][value='ripado']").check();
    await preferences.locator("input[name='form-input-73'][value='moderada']").check();
    await expect(preferences.locator("input[name='form-input-70'][value='ripado']")).toBeChecked();
    await expect(preferences.locator("input[name='form-input-73'][value='moderada']")).toBeChecked();
});
