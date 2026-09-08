import mongoose from "mongoose";
import { FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../domain/financial-domain.js";

export type FinancialEventType =
    | "charge-created"
    | "charge-terms-updated"
    | "receipt-confirmed"
    | "receipt-reversed"
    | "pix-presented"
    | "charge-cancelled";

export interface FinancialEventObject {
    eventId: string;
    paymentId: mongoose.Types.ObjectId;
    clientId: mongoose.Types.ObjectId;
    type: FinancialEventType;
    currency: typeof FINANCIAL_CURRENCY;
    timeZone: typeof FINANCIAL_TIME_ZONE;
    occurredAt: Date;
    actorId: string;
    actorSessionId: string;
    actorRole: "admin" | "client" | "provider" | "system";
    idempotencySource: "manual" | "provider" | "system";
    idempotencyKey: string;
    externalProvider?: string;
    externalEventId?: string;
    externalTransactionId?: string;
    receiptId?: string;
    reversesReceiptId?: string;
    partType?: "down-payment" | "installment";
    installmentNumber?: number;
    amountCents?: number;
    details?: Record<string, unknown>;
}

const financialEventSchema = new mongoose.Schema<FinancialEventObject>({
    eventId: { type: String, required: true, unique: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "ClientPayment", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    type: {
        type: String,
        enum: ["charge-created", "charge-terms-updated", "receipt-confirmed", "receipt-reversed", "pix-presented", "charge-cancelled"],
        required: true
    },
    currency: { type: String, enum: [FINANCIAL_CURRENCY], required: true },
    timeZone: { type: String, enum: [FINANCIAL_TIME_ZONE], required: true },
    occurredAt: { type: Date, required: true },
    actorId: { type: String, required: true },
    actorSessionId: { type: String, required: true },
    actorRole: { type: String, enum: ["admin", "client", "provider", "system"], required: true },
    idempotencySource: { type: String, enum: ["manual", "provider", "system"], required: true },
    idempotencyKey: { type: String, required: true },
    externalProvider: { type: String },
    externalEventId: { type: String },
    externalTransactionId: { type: String },
    receiptId: { type: String },
    reversesReceiptId: { type: String },
    partType: { type: String, enum: ["down-payment", "installment"] },
    installmentNumber: { type: Number, min: 1 },
    amountCents: { type: Number, min: 0, validate: Number.isInteger },
    details: { type: mongoose.Schema.Types.Mixed }
}, {
    collection: "financial_events",
    timestamps: false,
    versionKey: false
});

financialEventSchema.index({ paymentId: 1, occurredAt: -1 });
financialEventSchema.index({ idempotencySource: 1, idempotencyKey: 1 }, { unique: true });
financialEventSchema.index(
    { externalProvider: 1, externalEventId: 1 },
    { unique: true, partialFilterExpression: { externalProvider: { $type: "string" }, externalEventId: { $type: "string" } } }
);
financialEventSchema.index(
    { externalProvider: 1, externalTransactionId: 1 },
    { partialFilterExpression: { externalProvider: { $type: "string" }, externalTransactionId: { $type: "string" } } }
);

export default mongoose.model<FinancialEventObject>("FinancialEvent", financialEventSchema);
