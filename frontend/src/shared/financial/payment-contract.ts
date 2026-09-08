export interface PaymentPixWindowContract {
    generatedAt: string;
    analysisWindowEndsAt: string;
}

export interface PaymentPartContract {
    amountCents: number;
    isPaid: boolean;
    dueDate?: string;
    pix?: PaymentPixWindowContract;
}

export interface PaymentInstallmentContract extends PaymentPartContract {
    number: number;
}

export interface ClientPaymentContract {
    id: string;
    title: string;
    totalAmountCents: number;
    installmentCount: number;
    firstDueDate?: string;
    downPaymentPercentage: number;
    discountPercentage: number;
    interestPercentage: number;
    discountAmountCents: number;
    downPayment: PaymentPartContract;
    finalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
    installments: PaymentInstallmentContract[];
    createdAt: string;
    updatedAt: string;
}

export interface AdminPaymentContract extends ClientPaymentContract {
    version: number;
    clientId: string;
    financedAmountCents: number;
    interestAmountCents: number;
    installmentTotalCents: number;
    financialTermsLocked: boolean;
}

export interface PaymentSummaryContract {
    paymentCount: number;
    totalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
}

export interface PaymentPageContract<TPayment extends ClientPaymentContract> {
    payments: TPayment[];
    page: { limit: number; hasMore: boolean; nextCursor?: string };
    summary: PaymentSummaryContract;
}
