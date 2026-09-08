export const FINANCIAL_CURRENCY = "BRL" as const;
export const FINANCIAL_TIME_ZONE = "America/Sao_Paulo" as const;

export type ChargeStatus = "open" | "partially-paid" | "paid" | "cancelled";
export type ChargePartStatus = "pending" | "paid";
export type SettlementSource = "manual" | "provider";

export interface ChargePartProjection {
    amountCents: number;
    isPaid: boolean;
}

export function chargePartStatus(part: ChargePartProjection): ChargePartStatus {
    return part.isPaid ? "paid" : "pending";
}

export function chargeStatus(
    parts: ChargePartProjection[],
    archivedAt?: Date
): ChargeStatus {
    if (archivedAt) return "cancelled";
    const payable = parts.filter(part => part.amountCents > 0);
    const paidCount = payable.filter(part => part.isPaid).length;
    if (payable.length > 0 && paidCount === payable.length) return "paid";
    return paidCount > 0 ? "partially-paid" : "open";
}

/**
 * Limite interno para uma futura integração. Cada adaptador de PSP deverá
 * autenticar o webhook antes de converter seu payload neste comando neutro.
 */
export interface ConfirmExternalReceiptCommand {
    paymentId: string;
    clientId: string;
    partType: "down-payment" | "installment";
    installmentNumber?: number;
    amountCents: number;
    currency: typeof FINANCIAL_CURRENCY;
    provider: string;
    externalTransactionId: string;
    externalEventId: string;
    idempotencyKey: string;
    occurredAt: Date;
}

export interface AuthenticatedPaymentNotification {
    authenticate(headers: Readonly<Record<string, string>>, rawBody: Buffer): Promise<boolean>;
    parse(rawBody: Buffer): Promise<ConfirmExternalReceiptCommand>;
}

export interface PaymentReconciliationPort {
    findReceipt(externalTransactionId: string): Promise<ConfirmExternalReceiptCommand | undefined>;
}
