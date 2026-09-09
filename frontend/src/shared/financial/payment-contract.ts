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

export interface FinancialHighlightContract {
    paymentId: string;
    paymentTitle: string;
    partType: "down-payment" | "installment";
    installmentNumber?: number;
    label: string;
    amountCents: number;
    dueDate: string;
    isPaid: boolean;
    pix?: PaymentPixWindowContract;
    hasActivePix: boolean;
}

export interface PaymentPageContract<TPayment extends ClientPaymentContract> {
    payments: TPayment[];
    page: { limit: number; hasMore: boolean; nextCursor?: string };
    summary: PaymentSummaryContract;
    highlight?: FinancialHighlightContract;
}

export interface PaymentPreviewContract {
    downPaymentCents: number;
    firstDueDate: string;
    installments: Array<{ amountCents: number; dueDate: string }>;
    finalAmountCents: number;
}

export interface PaymentPixResponseContract<TPayment extends ClientPaymentContract> {
    payment: TPayment;
    pix: {
        partType: "down-payment" | "installment";
        installmentNumber?: number;
        amountCents: number;
        brCode: string;
        qrCodeDataUrl: string;
        generatedAt: string;
        analysisWindowEndsAt: string;
    };
}

export function parseClientPayment(value: unknown): ClientPaymentContract {
    return parsePayment(value, false);
}

export function parseAdminPayment(value: unknown): AdminPaymentContract {
    return parsePayment(value, true) as AdminPaymentContract;
}

export function parsePaymentPage<TPayment extends ClientPaymentContract>(
    value: unknown,
    paymentParser: (payment: unknown) => TPayment
): PaymentPageContract<TPayment> {
    const record = objectValue(value);
    const page = objectValue(record.page);
    const summary = objectValue(record.summary);
    return {
        payments: arrayValue(record.payments).map(paymentParser),
        page: {
            limit: integerValue(page.limit),
            hasMore: booleanValue(page.hasMore),
            ...(page.nextCursor === undefined ? {} : { nextCursor: stringValue(page.nextCursor) })
        },
        summary: {
            paymentCount: integerValue(summary.paymentCount),
            totalAmountCents: integerValue(summary.totalAmountCents),
            paidAmountCents: integerValue(summary.paidAmountCents),
            remainingAmountCents: integerValue(summary.remainingAmountCents)
        },
        ...(record.highlight === undefined ? {} : { highlight: parseHighlight(record.highlight) })
    };
}

export function parsePaymentPreview(value: unknown): PaymentPreviewContract {
    const record = objectValue(value);
    return {
        downPaymentCents: integerValue(record.downPaymentCents),
        firstDueDate: stringValue(record.firstDueDate),
        installments: arrayValue(record.installments).map(value => {
            const installment = objectValue(value);
            return { amountCents: integerValue(installment.amountCents), dueDate: stringValue(installment.dueDate) };
        }),
        finalAmountCents: integerValue(record.finalAmountCents)
    };
}

export function parsePaymentPixResponse<TPayment extends ClientPaymentContract>(
    value: unknown,
    paymentParser: (payment: unknown) => TPayment
): PaymentPixResponseContract<TPayment> {
    const record = objectValue(value);
    const pix = objectValue(record.pix);
    const partType = stringValue(pix.partType);
    if (partType !== "down-payment" && partType !== "installment") invalidContract();
    return {
        payment: paymentParser(record.payment),
        pix: {
            partType,
            ...(pix.installmentNumber === undefined ? {} : { installmentNumber: integerValue(pix.installmentNumber) }),
            amountCents: integerValue(pix.amountCents),
            brCode: stringValue(pix.brCode),
            qrCodeDataUrl: stringValue(pix.qrCodeDataUrl),
            generatedAt: stringValue(pix.generatedAt),
            analysisWindowEndsAt: stringValue(pix.analysisWindowEndsAt)
        }
    };
}

function parsePayment(value: unknown, admin: boolean): ClientPaymentContract | AdminPaymentContract {
    const record = objectValue(value);
    const payment: ClientPaymentContract = {
        id: stringValue(record.id),
        title: stringValue(record.title),
        totalAmountCents: integerValue(record.totalAmountCents),
        installmentCount: integerValue(record.installmentCount),
        ...(record.firstDueDate === undefined ? {} : { firstDueDate: stringValue(record.firstDueDate) }),
        downPaymentPercentage: numberValue(record.downPaymentPercentage),
        discountPercentage: numberValue(record.discountPercentage),
        interestPercentage: numberValue(record.interestPercentage),
        discountAmountCents: integerValue(record.discountAmountCents),
        downPayment: parsePart(record.downPayment),
        finalAmountCents: integerValue(record.finalAmountCents),
        paidAmountCents: integerValue(record.paidAmountCents),
        remainingAmountCents: integerValue(record.remainingAmountCents),
        installments: arrayValue(record.installments).map(parseInstallment),
        createdAt: stringValue(record.createdAt),
        updatedAt: stringValue(record.updatedAt)
    };
    if (!admin) return payment;
    return {
        ...payment,
        version: integerValue(record.version),
        clientId: stringValue(record.clientId),
        financedAmountCents: integerValue(record.financedAmountCents),
        interestAmountCents: integerValue(record.interestAmountCents),
        installmentTotalCents: integerValue(record.installmentTotalCents),
        financialTermsLocked: booleanValue(record.financialTermsLocked)
    };
}

function parsePart(value: unknown): PaymentPartContract {
    const record = objectValue(value);
    return {
        amountCents: integerValue(record.amountCents),
        isPaid: booleanValue(record.isPaid),
        ...(record.dueDate === undefined ? {} : { dueDate: stringValue(record.dueDate) }),
        ...(record.pix === undefined ? {} : { pix: parsePixWindow(record.pix) })
    };
}

function parseInstallment(value: unknown): PaymentInstallmentContract {
    const record = objectValue(value);
    return { ...parsePart(record), number: integerValue(record.number) };
}

function parsePixWindow(value: unknown): PaymentPixWindowContract {
    const record = objectValue(value);
    return {
        generatedAt: stringValue(record.generatedAt),
        analysisWindowEndsAt: stringValue(record.analysisWindowEndsAt)
    };
}

function parseHighlight(value: unknown): FinancialHighlightContract {
    const record = objectValue(value);
    const partType = stringValue(record.partType);
    if (partType !== "down-payment" && partType !== "installment") invalidContract();
    return {
        paymentId: stringValue(record.paymentId),
        paymentTitle: stringValue(record.paymentTitle),
        partType,
        ...(record.installmentNumber === undefined ? {} : { installmentNumber: integerValue(record.installmentNumber) }),
        label: stringValue(record.label),
        amountCents: integerValue(record.amountCents),
        dueDate: stringValue(record.dueDate),
        isPaid: booleanValue(record.isPaid),
        ...(record.pix === undefined ? {} : { pix: parsePixWindow(record.pix) }),
        hasActivePix: booleanValue(record.hasActivePix)
    };
}

function objectValue(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) invalidContract();
    return value as Record<string, unknown>;
}

function arrayValue(value: unknown): unknown[] {
    if (!Array.isArray(value)) invalidContract();
    return value;
}

function stringValue(value: unknown): string {
    if (typeof value !== "string") invalidContract();
    return value;
}

function numberValue(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) invalidContract();
    return value;
}

function integerValue(value: unknown): number {
    const number = numberValue(value);
    if (!Number.isSafeInteger(number) || number < 0) invalidContract();
    return number;
}

function booleanValue(value: unknown): boolean {
    if (typeof value !== "boolean") invalidContract();
    return value;
}

function invalidContract(): never {
    throw new Error("O servidor retornou um contrato financeiro inválido.");
}
