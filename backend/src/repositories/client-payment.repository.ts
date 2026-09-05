import payments, { type ClientPaymentObject, type PaymentAuditEvent, type PixPaymentRequest } from "../models/clientPayment.js";

export type PaymentData = Omit<ClientPaymentObject, "_id" | "createdAt" | "updatedAt" | "__v">;
export type PaymentTermsData = Omit<PaymentData, "clientId" | "events" | "archivedAt">;

export class ClientPaymentRepository {
    findByClientId(clientId: string) {
        return payments.find({ clientId, archivedAt: null }).sort({ createdAt: -1 }).limit(200).lean();
    }

    findByIdAndClientId(id: string, clientId: string) {
        return payments.findOne({ _id: id, clientId, archivedAt: null });
    }

    create(data: PaymentData) {
        return payments.create(data);
    }

    update(id: string, clientId: string, version: number, data: PaymentTermsData, event: PaymentAuditEvent) {
        return payments.findOneAndUpdate({ _id: id, clientId, archivedAt: null, ...versionFilter(version) }, {
            $set: data,
            $push: { events: event },
            $inc: { __v: 1 }
        }, {
            new: true,
            runValidators: true
        });
    }

    archive(id: string, clientId: string, version: number, event: PaymentAuditEvent) {
        return payments.findOneAndUpdate(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version) },
            {
                $set: { archivedAt: event.occurredAt },
                $push: { events: event },
                $inc: { __v: 1 }
            },
            { new: true, runValidators: true }
        );
    }

    setDownPaymentPaid(id: string, clientId: string, version: number, isPaid: boolean, event: PaymentAuditEvent) {
        const settlementUpdate = isPaid
            ? { $set: { "downPayment.isPaid": true, "downPayment.paidAt": event.occurredAt, "downPayment.settlementSource": "manual" }, $unset: { "downPayment.pix": 1 } }
            : { $set: { "downPayment.isPaid": false }, $unset: { "downPayment.paidAt": 1, "downPayment.settlementSource": 1, "downPayment.pix": 1 } };
        return payments.findOneAndUpdate(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), ...(isPaid ? { "downPayment.amountCents": { $gt: 0 } } : {}) },
            { ...settlementUpdate, $push: { events: event }, $inc: { __v: 1 } },
            { new: true, runValidators: true }
        );
    }

    setInstallmentPaid(id: string, clientId: string, version: number, number: number, isPaid: boolean, event: PaymentAuditEvent) {
        const settlementUpdate = isPaid
            ? { $set: { "installments.$.isPaid": true, "installments.$.paidAt": event.occurredAt, "installments.$.settlementSource": "manual" }, $unset: { "installments.$.pix": 1 } }
            : { $set: { "installments.$.isPaid": false }, $unset: { "installments.$.paidAt": 1, "installments.$.settlementSource": 1, "installments.$.pix": 1 } };
        return payments.findOneAndUpdate(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), "installments.number": number },
            { ...settlementUpdate, $push: { events: event }, $inc: { __v: 1 } },
            { new: true, runValidators: true }
        );
    }

    setDownPaymentPix(id: string, clientId: string, version: number, pix: PixPaymentRequest, event: PaymentAuditEvent) {
        return payments.findOneAndUpdate(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), "downPayment.isPaid": false, "downPayment.amountCents": { $gt: 0 } },
            { $set: { "downPayment.pix": pix }, $push: { events: event }, $inc: { __v: 1 } },
            { new: true, runValidators: true }
        );
    }

    setInstallmentPix(id: string, clientId: string, version: number, number: number, pix: PixPaymentRequest, event: PaymentAuditEvent) {
        return payments.findOneAndUpdate(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), installments: { $elemMatch: { number, isPaid: false } } },
            { $set: { "installments.$[installment].pix": pix }, $push: { events: event }, $inc: { __v: 1 } },
            { new: true, runValidators: true, arrayFilters: [{ "installment.number": number, "installment.isPaid": false }] }
        );
    }
}

function versionFilter(version: number) {
    return version === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: version };
}
