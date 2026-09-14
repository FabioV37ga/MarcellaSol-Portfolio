import type { AdminPaymentContract, PaymentInstallmentContract, PaymentPageContract, PaymentPartContract, PaymentPreviewContract } from "@/shared/financial/payment-contract.js";
import { parseAdminPayment, parsePaymentPage, parsePaymentPreview } from "@/shared/financial/payment-contract.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import type { AdminSession } from "./admin-system.api.js";

export interface PaymentPart extends PaymentPartContract { }
export interface PaymentInstallment extends PaymentInstallmentContract { }
export interface ClientPayment extends AdminPaymentContract { downPayment: PaymentPart; installments: PaymentInstallment[]; }
export interface PaymentPage extends PaymentPageContract<ClientPayment> { }
export interface PaymentPreview extends PaymentPreviewContract { }
export interface PaymentFields {
    title: string; totalAmount: string; installmentCount: number; firstDueDate: string;
    downPaymentPercentage?: string; discountPercentage?: string; interestPercentage?: string;
    downPaymentIsPaid?: boolean; paidInstallmentNumbers?: number[]; version?: number;
}
export type PaymentPreviewFields = Pick<PaymentFields, "totalAmount" | "installmentCount" | "firstDueDate" | "downPaymentPercentage" | "discountPercentage" | "interestPercentage">;

export interface AdminPaymentsGateway {
    loadPayments(session: AdminSession, clientId: string, cursor?: string): Promise<PaymentPage>;
    previewPayment(session: AdminSession, fields: PaymentPreviewFields, signal?: AbortSignal): Promise<PaymentPreview>;
    createPayment(session: AdminSession, clientId: string, fields: PaymentFields): Promise<ClientPayment>;
    editPayment(session: AdminSession, clientId: string, paymentId: string, fields: PaymentFields): Promise<ClientPayment>;
    removePayment(session: AdminSession, clientId: string, paymentId: string, version: number, confirmedReceiptHistoryAcknowledged: boolean): Promise<void>;
    setDownPaymentPaid(session: AdminSession, clientId: string, paymentId: string, isPaid: boolean, version: number): Promise<ClientPayment>;
    setInstallmentPaid(session: AdminSession, clientId: string, paymentId: string, installmentNumber: number, isPaid: boolean, version: number): Promise<ClientPayment>;
}

interface PaymentEnvelope { payment?: unknown; preview?: unknown; }

export class AdminPaymentsApi implements AdminPaymentsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }

    async loadPayments(session: AdminSession, clientId: string, cursor?: string): Promise<PaymentPage> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const result = await this.http.request<unknown>(`/admin/clients/${encodeURIComponent(clientId)}/payments${query}`, { token: session.token });
        return parsePaymentPage(result, parseAdminPayment) as PaymentPage;
    }

    async previewPayment(session: AdminSession, fields: PaymentPreviewFields, signal?: AbortSignal): Promise<PaymentPreview> {
        const result = await this.http.request<PaymentEnvelope>("/admin/payments/preview", { method: "POST", token: session.token, json: fields, signal });
        if (!result?.preview) throw new Error("Resposta inválida ao calcular o pagamento");
        return parsePaymentPreview(result.preview);
    }

    createPayment(session: AdminSession, clientId: string, fields: PaymentFields): Promise<ClientPayment> {
        return this.savePayment(session, clientId, fields);
    }

    editPayment(session: AdminSession, clientId: string, paymentId: string, fields: PaymentFields): Promise<ClientPayment> {
        return this.savePayment(session, clientId, fields, paymentId);
    }

    async removePayment(session: AdminSession, clientId: string, paymentId: string, version: number, confirmedReceiptHistoryAcknowledged: boolean): Promise<void> {
        await this.http.request(`/admin/clients/${encodeURIComponent(clientId)}/payments/${encodeURIComponent(paymentId)}`, {
            method: "DELETE", token: session.token, json: { version, confirmedReceiptHistoryAcknowledged }
        });
    }

    setDownPaymentPaid(session: AdminSession, clientId: string, paymentId: string, isPaid: boolean, version: number): Promise<ClientPayment> {
        return this.setPaymentPartPaid(session, clientId, paymentId, "down-payment", isPaid, version);
    }

    setInstallmentPaid(session: AdminSession, clientId: string, paymentId: string, installmentNumber: number, isPaid: boolean, version: number): Promise<ClientPayment> {
        return this.setPaymentPartPaid(session, clientId, paymentId, `installments/${encodeURIComponent(installmentNumber)}`, isPaid, version);
    }

    private async savePayment(session: AdminSession, clientId: string, fields: PaymentFields, paymentId?: string): Promise<ClientPayment> {
        const suffix = paymentId ? `/${encodeURIComponent(paymentId)}` : "";
        const result = await this.http.request<PaymentEnvelope>(`/admin/clients/${encodeURIComponent(clientId)}/payments${suffix}`, {
            method: paymentId ? "PUT" : "POST", token: session.token, json: fields
        });
        if (!result?.payment) throw new Error("Resposta inválida ao salvar pagamento");
        return parseAdminPayment(result.payment) as ClientPayment;
    }

    private async setPaymentPartPaid(session: AdminSession, clientId: string, paymentId: string, path: string, isPaid: boolean, version: number): Promise<ClientPayment> {
        const result = await this.http.request<PaymentEnvelope>(`/admin/clients/${encodeURIComponent(clientId)}/payments/${encodeURIComponent(paymentId)}/${path}`, {
            method: "PATCH", token: session.token, json: { isPaid, version }
        });
        if (!result?.payment) throw new Error("Resposta inválida ao atualizar pagamento");
        return parseAdminPayment(result.payment) as ClientPayment;
    }
}
