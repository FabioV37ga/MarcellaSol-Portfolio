import { expect, test } from "@playwright/test";

test("publica regras de indexação e o favicon institucional", async ({ page, request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    const robotsContent = await robots.text();
    expect(robotsContent).toContain("Disallow: /admin.html");
    expect(robotsContent).toContain("Disallow: /cliente.html");
    expect(robotsContent).toContain("Disallow: /api/");

    const favicon = await request.get("/client-favicon.svg");
    expect(favicon.ok()).toBe(true);
    expect(favicon.headers()["content-type"]).toContain("image/svg+xml");

    for (const path of ["/", "/projects.html", "/admin.html", "/cliente.html"]) {
        await page.goto(path);
        await expect(page.locator("link[rel='icon']")).toHaveAttribute("href", "/client-favicon.svg");
    }

    await page.goto("/admin.html");
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex, nofollow");
    await page.goto("/cliente.html");
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex, nofollow");
});
