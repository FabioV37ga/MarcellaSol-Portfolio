import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

export interface PdfRenderOptions {
    temporaryDirectory?: string;
}

export interface PdfRenderer {
    render(html: string, options?: PdfRenderOptions): Promise<Buffer>;
}

interface BrowserPage {
    goto(url: string, options: { waitUntil: "domcontentloaded" }): Promise<unknown>;
    setContent(html: string, options: { waitUntil: "domcontentloaded" }): Promise<unknown>;
    evaluate<Result>(callback: () => Result): Promise<Awaited<Result>>;
    pdf(options: Record<string, unknown>): Promise<Uint8Array>;
}

interface BrowserInstance {
    newPage(): Promise<BrowserPage>;
    close(): Promise<void>;
}

export type BrowserLauncher = () => Promise<BrowserInstance>;

const launchBrowser: BrowserLauncher = async () => puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"]
}) as unknown as BrowserInstance;

export class PuppeteerPdfRenderer implements PdfRenderer {
    constructor(private readonly launcher: BrowserLauncher = launchBrowser) { }

    async render(html: string, options: PdfRenderOptions = {}): Promise<Buffer> {
        const browser = await this.launcher();
        try {
            const page = await browser.newPage();
            await this.loadHtml(page, html, options.temporaryDirectory);
            await this.waitForImages(page);
            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: "<span></span>",
                footerTemplate: '<div style="width:100%;font-size:8px;color:#8a7f7a;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
                margin: { top: "15mm", right: "14mm", bottom: "17mm", left: "14mm" }
            });
            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }

    private async loadHtml(page: BrowserPage, html: string, temporaryDirectory?: string): Promise<void> {
        if (!temporaryDirectory) {
            await page.setContent(html, { waitUntil: "domcontentloaded" });
            return;
        }

        const htmlPath = path.join(temporaryDirectory, "report.html");
        await fs.writeFile(htmlPath, html, "utf8");
        await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
    }

    private async waitForImages(page: BrowserPage): Promise<void> {
        await page.evaluate(async () => {
            const images = Array.from(globalThis.document.images);
            await Promise.race([
                Promise.all(images.map(image => image.complete
                    ? Promise.resolve()
                    : new Promise<void>(resolve => {
                        image.addEventListener("load", () => resolve(), { once: true });
                        image.addEventListener("error", () => resolve(), { once: true });
                    }))),
                new Promise<void>(resolve => setTimeout(resolve, 10_000))
            ]);
        });
    }
}
