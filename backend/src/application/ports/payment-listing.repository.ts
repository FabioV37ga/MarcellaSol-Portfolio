import mongoose from "mongoose";
import type { ClientPaymentObject, PixPaymentRequest } from "../../models/clientPayment.js";

export interface PaymentPageCursor {
    createdAt: Date;
    id: mongoose.Types.ObjectId;
}

export interface PaymentPageOptions {
    limit: number;
    cursor?: PaymentPageCursor;
}

export interface PaymentSummary {
    paymentCount: number;
    totalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
}

export interface PaymentHighlightCandidate {
    paymentId: mongoose.Types.ObjectId;
    paymentTitle: string;
    partType: "down-payment" | "installment";
    installmentNumber?: number;
    amountCents: number;
    dueDate: string;
    isPaid: boolean;
    pix?: PixPaymentRequest;
}

export interface PaymentHighlightCandidates {
    overdue?: PaymentHighlightCandidate;
    currentUnpaid?: PaymentHighlightCandidate;
    currentLast?: PaymentHighlightCandidate;
    nextUnpaid?: PaymentHighlightCandidate;
    latestPast?: PaymentHighlightCandidate;
}

export interface PaymentListingRepository {
    findPageByClientId(
        clientId: string,
        options: PaymentPageOptions
    ): PromiseLike<{ records: ClientPaymentObject[]; hasMore: boolean }>;
    summarizeByClientId(clientId: string): PromiseLike<PaymentSummary>;
    findHighlightCandidatesByClientId(
        clientId: string,
        today: string,
        monthStart: string,
        nextMonthStart: string
    ): PromiseLike<PaymentHighlightCandidates>;
}
