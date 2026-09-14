import { describe, expect, it, vi } from "vitest";
import { AdminPaymentsApi } from "../src/admin/infrastructure/payments.api.js";
import { ClientPaymentsApi } from "../src/client/infrastructure/payments.api.js";
import type { HttpClient } from "../src/shared/http/http-client.js";

const emptyPage = {
    payments: [],
    page: { limit: 20, hasMore: false },
    summary: { paymentCount: 0, totalAmountCents: 0, paidAmountCents: 0, remainingAmountCents: 0 }
};

describe("APIs financeiras", () => {
    it("admin usa transporte compartilhado com sessão e cursor", async () => {
        const request = vi.fn().mockResolvedValue(emptyPage);
        const api = new AdminPaymentsApi({ request } as unknown as HttpClient);
        const result = await api.loadPayments({ token: "admin-token" }, "cliente/a", "cursor+1");

        expect(result).toEqual(emptyPage);
        expect(request).toHaveBeenCalledWith(
            "/admin/clients/cliente%2Fa/payments?cursor=cursor%2B1",
            { token: "admin-token" }
        );
    });

    it("cliente usa transporte compartilhado e valida a página", async () => {
        const request = vi.fn().mockResolvedValue(emptyPage);
        const api = new ClientPaymentsApi({ request } as unknown as HttpClient);
        const result = await api.loadPayments("client-token");

        expect(result).toEqual(emptyPage);
        expect(request).toHaveBeenCalledWith("/client/payments", { token: "client-token" });
    });
});
