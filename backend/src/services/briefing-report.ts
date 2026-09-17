import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import {
    buildBriefingReportHtml,
    type BriefingReportOptions
} from "./briefing-report.template.js";
import type { BriefingReportDocument } from "./briefing-report.mapper.js";

export { buildBriefingReportHtml } from "./briefing-report.template.js";
export type { BriefingReportOptions } from "./briefing-report.template.js";
export type { BriefingReportDocument } from "./briefing-report.mapper.js";

export async function generateBriefingReportPdf(
    document: BriefingReportDocument,
    options: BriefingReportOptions = {}
): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"]
    });
    try {
        const page = await browser.newPage();
        const html = buildBriefingReportHtml(document, options);
        if (options.temporaryDirectory) {
            const htmlPath = path.join(options.temporaryDirectory, "report.html");
            fs.writeFileSync(htmlPath, html, "utf8");
            await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
        } else {
            await page.setContent(html, { waitUntil: "domcontentloaded" });
        }
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
