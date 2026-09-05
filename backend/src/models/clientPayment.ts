import mongoose from "mongoose";

export interface PaymentPart {
    amountCents: number;
    isPaid: boolean;
    dueDate: string;
    paidAt?: Date;
    settlementSource?: "manual" | "pix";
    pix?: PixPaymentRequest;
}

export interface PixPaymentRequest {
    txid: string;
    brCode: string;
    generatedAt: Date;
    expiresAt: Date;
}

export interface PaymentInstallment extends PaymentPart {
    number: number;
}

export interface PaymentTermsSnapshot {
    title: string;
    totalAmountCents: number;
    installmentCount: number;
    firstDueDate: string;
    downPaymentPercentage: number;
    discountPercentage: number;
    interestPercentage: number;
    downPaymentIsPaid: boolean;
    paidInstallmentNumbers: number[];
}

export interface PaymentAuditEvent {
    eventId: string;
    type: "created" | "terms-updated" | "manual-status-change" | "pix-code-generated" | "archived";
    actorId: string;
    actorSessionId: string;
    actorRole: "admin" | "client";
    occurredAt: Date;
    partType?: "down-payment" | "installment";
    installmentNumber?: number;
    previousIsPaid?: boolean;
    isPaid?: boolean;
    before?: PaymentTermsSnapshot;
    after?: PaymentTermsSnapshot;
    pixTxid?: string;
    pixExpiresAt?: Date;
    hadConfirmedReceiptHistory?: boolean;
}

export interface ClientPaymentObject {
    _id: mongoose.Types.ObjectId;
    clientId: mongoose.Types.ObjectId;
    title: string;
    totalAmountCents: number;
    installmentCount: number;
    firstDueDate: string;
    downPaymentPercentage: number;
    discountPercentage: number;
    interestPercentage: number;
    discountAmountCents: number;
    downPayment: PaymentPart;
    financedAmountCents: number;
    interestAmountCents: number;
    installmentTotalCents: number;
    finalAmountCents: number;
    installments: PaymentInstallment[];
    events: PaymentAuditEvent[];
    archivedAt?: Date;
    __v: number;
    createdAt: Date;
    updatedAt: Date;
}

const pixPaymentRequestSchema = new mongoose.Schema<PixPaymentRequest>({
    txid: { type: String, required: true, minlength: 1, maxlength: 25, match: /^[A-Za-z0-9]+$/ },
    brCode: { type: String, required: true, maxlength: 512 },
    generatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
}, { _id: false });

const paymentPartSchema = new mongoose.Schema<PaymentPart>({
    amountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    isPaid: { type: Boolean, required: true, default: false },
    dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    paidAt: { type: Date },
    settlementSource: { type: String, enum: ["manual", "pix"] },
    pix: { type: pixPaymentRequestSchema }
}, { _id: false });

const installmentSchema = new mongoose.Schema<PaymentInstallment>({
    number: { type: Number, required: true, min: 1, validate: Number.isInteger },
    amountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    isPaid: { type: Boolean, required: true, default: false },
    dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    paidAt: { type: Date },
    settlementSource: { type: String, enum: ["manual", "pix"] },
    pix: { type: pixPaymentRequestSchema }
}, { _id: false });

const termsSnapshotSchema = new mongoose.Schema<PaymentTermsSnapshot>({
    title: { type: String, required: true },
    totalAmountCents: { type: Number, required: true },
    installmentCount: { type: Number, required: true },
    firstDueDate: { type: String, required: true },
    downPaymentPercentage: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    interestPercentage: { type: Number, required: true },
    downPaymentIsPaid: { type: Boolean, required: true },
    paidInstallmentNumbers: { type: [Number], required: true }
}, { _id: false });

const auditEventSchema = new mongoose.Schema<PaymentAuditEvent>({
    eventId: { type: String, required: true },
    type: { type: String, enum: ["created", "terms-updated", "manual-status-change", "pix-code-generated", "archived"], required: true },
    actorId: { type: String, required: true },
    actorSessionId: { type: String, required: true },
    actorRole: { type: String, enum: ["admin", "client"], required: true },
    occurredAt: { type: Date, required: true },
    partType: { type: String, enum: ["down-payment", "installment"] },
    installmentNumber: { type: Number, min: 1 },
    previousIsPaid: { type: Boolean },
    isPaid: { type: Boolean },
    before: { type: termsSnapshotSchema },
    after: { type: termsSnapshotSchema },
    pixTxid: { type: String, minlength: 1, maxlength: 25, match: /^[A-Za-z0-9]+$/ },
    pixExpiresAt: { type: Date },
    hadConfirmedReceiptHistory: { type: Boolean }
}, { _id: false });

const clientPaymentSchema = new mongoose.Schema<ClientPaymentObject>({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    totalAmountCents: { type: Number, required: true, min: 1, max: 99_999_999_999, validate: Number.isInteger },
    installmentCount: { type: Number, required: true, min: 1, max: 120, validate: Number.isInteger },
    firstDueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    downPaymentPercentage: { type: Number, required: true, min: 0, max: 100 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    interestPercentage: { type: Number, required: true, min: 0, max: 100 },
    discountAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    downPayment: { type: paymentPartSchema, required: true },
    financedAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    interestAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    installmentTotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    finalAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    installments: { type: [installmentSchema], required: true },
    events: { type: [auditEventSchema], required: true, default: [] },
    archivedAt: { type: Date }
}, { collection: "financeiro", timestamps: true });

clientPaymentSchema.index({ clientId: 1, createdAt: -1 });
clientPaymentSchema.index({ clientId: 1, archivedAt: 1, createdAt: -1 });

export default mongoose.model<ClientPaymentObject>("ClientPayment", clientPaymentSchema);
