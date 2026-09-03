import payments, { type ClientPaymentObject } from "../models/clientPayment.js";

export type PaymentData = Omit<ClientPaymentObject, "_id" | "createdAt" | "updatedAt">;

export class ClientPaymentRepository {
    findByClientId(clientId: string) {
        return payments.find({ clientId }).sort({ createdAt: -1 }).lean();
    }

    findByIdAndClientId(id: string, clientId: string) {
        return payments.findOne({ _id: id, clientId });
    }

    create(data: PaymentData) {
        return payments.create(data);
    }

    update(id: string, clientId: string, data: Omit<PaymentData, "clientId">) {
        return payments.findOneAndUpdate({ _id: id, clientId }, { $set: data }, {
            new: true,
            runValidators: true
        });
    }

    setDownPaymentPaid(id: string, clientId: string, isPaid: boolean) {
        return payments.findOneAndUpdate(
            { _id: id, clientId, ...(isPaid ? { "downPayment.amountCents": { $gt: 0 } } : {}) },
            { $set: { "downPayment.isPaid": isPaid } },
            { new: true, runValidators: true }
        );
    }

    setInstallmentPaid(id: string, clientId: string, number: number, isPaid: boolean) {
        return payments.findOneAndUpdate(
            { _id: id, clientId, "installments.number": number },
            { $set: { "installments.$.isPaid": isPaid } },
            { new: true, runValidators: true }
        );
    }
}
