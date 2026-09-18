import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminDirectory = path.resolve("src/admin/styles/system");
const clientDirectory = path.resolve("src/client/styles/system");

describe("estilos financeiros", () => {
    it("mantém o financeiro administrativo separado por responsabilidade", async () => {
        const entrypoint = await readFile(path.join(adminDirectory, "client-financial.css"), "utf8");
        expect(entrypoint.trim().split("\n")).toEqual([
            '@import url("./client-financial/page.css");',
            '@import url("./client-financial/payments.css");',
            '@import url("./client-financial/payment-dialog.css");',
            '@import url("./client-financial/delete-dialog.css");',
            '@import url("./client-financial/actions.css");',
            '@import url("./client-financial/responsive.css");'
        ]);

        const [page, payments, paymentDialog, deleteDialog] = await Promise.all([
            "page.css", "payments.css", "payment-dialog.css", "delete-dialog.css"
        ].map(file => readFile(path.join(adminDirectory, "client-financial", file), "utf8")));
        expect(page).toContain(".financial-management-container");
        expect(payments).toContain(".financial-payment-card");
        expect(paymentDialog).toContain(".financial-payment-dialog");
        expect(deleteDialog).toContain(".financial-delete-dialog");
    });

    it("mantém o financeiro do cliente separado por responsabilidade", async () => {
        const entrypoint = await readFile(path.join(clientDirectory, "financial.css"), "utf8");
        expect(entrypoint.trim().split("\n")).toEqual([
            '@import url("./financial/page.css");',
            '@import url("./financial/highlight.css");',
            '@import url("./financial/panel.css");',
            '@import url("./financial/payments.css");',
            '@import url("./financial/pix-dialog.css");',
            '@import url("./financial/actions.css");',
            '@import url("./financial/responsive.css");'
        ]);

        const [highlight, payments, pixDialog] = await Promise.all([
            "highlight.css", "payments.css", "pix-dialog.css"
        ].map(file => readFile(path.join(clientDirectory, "financial", file), "utf8")));
        expect(highlight).toContain(".client-financial-highlight");
        expect(payments).toContain(".client-financial-payment");
        expect(pixDialog).toContain(".client-pix-dialog");
    });
});
