import mongoose from "mongoose";

export interface PaymentPart {
    amountCents: number;
    isPaid: boolean;
}

export interface PaymentInstallment extends PaymentPart {
    number: number;
}

export interface ClientPaymentObject {
    _id: mongoose.Types.ObjectId;
    clientId: mongoose.Types.ObjectId;
    title: string;
    totalAmountCents: number;
    installmentCount: number;
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
    createdAt: Date;
    updatedAt: Date;
}

const paymentPartSchema = new mongoose.Schema<PaymentPart>({
    amountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    isPaid: { type: Boolean, required: true, default: false }
}, { _id: false });

const installmentSchema = new mongoose.Schema<PaymentInstallment>({
    number: { type: Number, required: true, min: 1, validate: Number.isInteger },
    amountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    isPaid: { type: Boolean, required: true, default: false }
}, { _id: false });

const clientPaymentSchema = new mongoose.Schema<ClientPaymentObject>({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    totalAmountCents: { type: Number, required: true, min: 1, validate: Number.isInteger },
    installmentCount: { type: Number, required: true, min: 1, max: 120, validate: Number.isInteger },
    downPaymentPercentage: { type: Number, required: true, min: 0, max: 100 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    interestPercentage: { type: Number, required: true, min: 0, max: 100 },
    discountAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    downPayment: { type: paymentPartSchema, required: true },
    financedAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    interestAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    installmentTotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    finalAmountCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    installments: { type: [installmentSchema], required: true }
}, { collection: "financeiro", timestamps: true });

clientPaymentSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.model<ClientPaymentObject>("ClientPayment", clientPaymentSchema);
