import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PuppeteerPdfRenderer } from "../dist/src/services/briefing-report-pdf.renderer.js";

function createBrowserDouble({ pdf = Uint8Array.from([1, 2, 3]), onClose = () => undefined } = {}) {
    const calls = [];
    const page = {
        async goto(url, options) { calls.push(["goto", url, options]); },
        async setContent(html, options) { calls.push(["setContent", html, options]); },
        async evaluate() { calls.push(["evaluate"]); },
        async pdf(options) {
            calls.push(["pdf", options]);
            return pdf;
        }
    };
    return {
        calls,
        launcher: async () => ({
            async newPage() { calls.push(["newPage"]); return page; },
            async close() { calls.push(["close"]); onClose(); }
        })
    };
}

test("renderer grava HTML temporário, espera imagens e gera o PDF configurado", async () => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "renderer-test-"));
    try {
        const browser = createBrowserDouble();
        const renderer = new PuppeteerPdfRenderer(browser.launcher);

        const result = await renderer.render("<html><body>Relatório</body></html>", { temporaryDirectory });

        assert.deepEqual(result, Buffer.from([1, 2, 3]));
        assert.equal(await fs.readFile(path.join(temporaryDirectory, "report.html"), "utf8"), "<html><body>Relatório</body></html>");
        assert.deepEqual(browser.calls.map(([name]) => name), ["newPage", "goto", "evaluate", "pdf", "close"]);
        assert.match(browser.calls[1][1], /^file:/);
        assert.deepEqual(browser.calls[3][1].margin, {
            top: "15mm",
            right: "14mm",
            bottom: "17mm",
            left: "14mm"
        });
    } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
});

test("renderer fecha o navegador quando a geração do PDF falha", async () => {
    let closed = false;
    const browser = createBrowserDouble({ onClose: () => { closed = true; } });
    const renderer = new PuppeteerPdfRenderer(async () => {
        const instance = await browser.launcher();
        return {
            ...instance,
            async newPage() {
                const page = await instance.newPage();
                return {
                    ...page,
                    async pdf() { throw new Error("falha simulada"); }
                };
            }
        };
    });

    await assert.rejects(renderer.render("<p>teste</p>"), /falha simulada/);
    assert.equal(closed, true);
});
