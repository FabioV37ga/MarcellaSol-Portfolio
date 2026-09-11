import type { ClientPaymentObject, PaymentPart } from "../../models/clientPayment.js";
import { chargePartStatus, chargeStatus, FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../../domain/financial-domain.js";

export function hasConfirmedReceiptHistory(payment: ClientPaymentObject): boolean {
    return payment.hasReceiptHistory === true
        || payment.downPayment.isPaid
        || payment.installments.some(item => item.isPaid)
        || (payment.events ?? []).some(event => event.isPaid === true
            || event.after?.downPaymentIsPaid === true
            || Boolean(event.after?.paidInstallmentNumbers?.length));
}

export function paymentResponse(payment: ClientPaymentObject) {
    const paidAmountCents = (payment.downPayment.isPaid ? payment.downPayment.amountCents : 0)
        + payment.installments.reduce((total, item) => total + (item.isPaid ? item.amountCents : 0), 0);
    return {
        id: payment._id.toString(),
        version: payment.__v ?? 0,
        currency: payment.currency ?? FINANCIAL_CURRENCY,
        timeZone: payment.timeZone ?? FINANCIAL_TIME_ZONE,
        status: payment.status ?? chargeStatus([payment.downPayment, ...payment.installments], payment.archivedAt),
        clientId: payment.clientId.toString(),
        title: payment.title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
        firstDueDate: payment.firstDueDate,
        downPaymentPercentage: payment.downPaymentPercentage,
        discountPercentage: payment.discountPercentage,
        interestPercentage: payment.interestPercentage,
        discountAmountCents: payment.discountAmountCents,
        downPayment: responsePaymentPart(payment.downPayment),
        financedAmountCents: payment.financedAmountCents,
        interestAmountCents: payment.interestAmountCents,
        installmentTotalCents: payment.installmentTotalCents,
        finalAmountCents: payment.finalAmountCents,
        paidAmountCents,
        remainingAmountCents: Math.max(0, payment.finalAmountCents - paidAmountCents),
        financialTermsLocked: hasConfirmedReceiptHistory(payment),
        installments: payment.installments.map(item => ({ number: item.number, ...responsePaymentPart(item) })),
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    };
}

export function clientPaymentResponse(payment: ClientPaymentObject, now = new Date()) {
    const response = paymentResponse(payment);
    return {
        id: response.id,
        title: response.title,
        totalAmountCents: response.totalAmountCents,
        installmentCount: response.installmentCount,
        firstDueDate: response.firstDueDate,
        downPaymentPercentage: response.downPaymentPercentage,
        discountPercentage: response.discountPercentage,
        interestPercentage: response.interestPercentage,
        discountAmountCents: response.discountAmountCents,
        downPayment: publicPaymentPart(response.downPayment, now),
        finalAmountCents: response.finalAmountCents,
        paidAmountCents: response.paidAmountCents,
        remainingAmountCents: response.remainingAmountCents,
        installments: response.installments.map(item => ({ number: item.number, ...publicPaymentPart(item, now) })),
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
    };
}

export function pixAnalysisWindowEnd(pix: PaymentPart["pix"]): Date | undefined {
    return pix?.analysisWindowEndsAt ?? pix?.expiresAt;
}

function publicPaymentPart(part: PaymentPart, now: Date) {
    const analysisWindowEndsAt = part.pix ? pixAnalysisWindowEnd(part.pix) : undefined;
    const hasActivePix = !part.isPaid && part.pix && analysisWindowEndsAt
        && analysisWindowEndsAt.getTime() > now.getTime();
    return {
        amountCents: part.amountCents,
        isPaid: part.isPaid,
        status: chargePartStatus(part),
        dueDate: part.dueDate,
        ...(hasActivePix ? { pix: { generatedAt: part.pix!.generatedAt, analysisWindowEndsAt } } : {})
    };
}

function responsePaymentPart(part: PaymentPart) {
    return {
        amountCents: part.amountCents,
        isPaid: part.isPaid,
        status: chargePartStatus(part),
        dueDate: part.dueDate,
        ...(part.paidAt ? { paidAt: part.paidAt } : {}),
        ...(part.settlementSource ? { settlementSource: part.settlementSource } : {}),
        ...(part.pix ? { pix: part.pix } : {})
    };
}
