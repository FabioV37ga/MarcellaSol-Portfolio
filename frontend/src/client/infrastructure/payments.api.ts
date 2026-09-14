import type { ClientPaymentContract, PaymentInstallmentContract, PaymentPageContract, PaymentPartContract, PaymentPixResponseContract } from "@/shared/financial/payment-contract.js";
import { parseClientPayment, parsePaymentPage, parsePaymentPixResponse } from "@/shared/financial/payment-contract.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";

export interface ClientPaymentPart extends PaymentPartContract { }
export interface ClientPaymentInstallment extends PaymentInstallmentContract { }
export interface ClientPayment extends ClientPaymentContract { downPayment: ClientPaymentPart; installments: ClientPaymentInstallment[]; }
export interface ClientPaymentPage extends PaymentPageContract<ClientPayment> { }
export interface ClientPixResponse extends PaymentPixResponseContract<ClientPayment> { }
export interface ClientPaymentsGateway {
    loadPayments(token: string, cursor?: string): Promise<ClientPaymentPage>;
    generatePaymentPix(token: string, paymentId: string, partType: "down-payment" | "installment", installmentNumber?: number): Promise<ClientPixResponse>;
}

export class ClientPaymentsApi implements ClientPaymentsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }

    async loadPayments(token: string, cursor?: string): Promise<ClientPaymentPage> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const result = await this.http.request<unknown>(`/client/payments${query}`, { token });
        return parsePaymentPage(result, parseClientPayment) as ClientPaymentPage;
    }

    async generatePaymentPix(token: string, paymentId: string, partType: "down-payment" | "installment", installmentNumber?: number): Promise<ClientPixResponse> {
        const result = await this.http.request<Record<string, unknown>>(`/client/payments/${encodeURIComponent(paymentId)}/pix`, {
            method: "POST", token, json: { partType, ...(installmentNumber === undefined ? {} : { installmentNumber }) }
        });
        if (!result?.payment || !result.pix) throw new Error("Não foi possível gerar o código Pix.");
        return parsePaymentPixResponse(result, parseClientPayment) as ClientPixResponse;
    }
}
