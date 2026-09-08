import mongoose, { type ClientSession, type QueryOptions, type UpdateQuery } from "mongoose";
import { FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../domain/financial-domain.js";
import type { ChargeStatus } from "../domain/financial-domain.js";
import financialEvents, { type FinancialEventObject, type FinancialEventType } from "../models/financialEvent.js";
import payments, { type ClientPaymentObject, type PaymentAuditEvent, type PixPaymentRequest } from "../models/clientPayment.js";

export type PaymentData = Omit<ClientPaymentObject, "_id" | "createdAt" | "updatedAt" | "__v">;
export type PaymentTermsData = Omit<PaymentData, "clientId" | "events" | "archivedAt" | "currency" | "timeZone" | "status" | "hasReceiptHistory">;

export class ClientPaymentRepository {
    findByClientId(clientId: string) {
        return payments.find({ clientId, archivedAt: null }).sort({ createdAt: -1 }).limit(200).lean();
    }

    findByIdAndClientId(id: string, clientId: string) {
        return payments.findOne({ _id: id, clientId, archivedAt: null });
    }

    async create(data: PaymentData) {
        const event = data.events[0];
        return inTransaction(async session => {
            const [created] = await payments.create([{ ...data, events: [] }], { session });
            await appendFinancialEvent(created, event, session);
            return created;
        });
    }

    update(id: string, clientId: string, version: number, data: PaymentTermsData, event: PaymentAuditEvent) {
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version) },
            { $set: data, $inc: { __v: 1 } },
            event
        );
    }

    archive(id: string, clientId: string, version: number, event: PaymentAuditEvent) {
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version) },
            {
                $set: { archivedAt: event.occurredAt, status: "cancelled" },
                $inc: { __v: 1 }
            },
            event
        );
    }

    setDownPaymentPaid(id: string, clientId: string, version: number, isPaid: boolean, event: PaymentAuditEvent, status: ChargeStatus) {
        const settlementUpdate: UpdateQuery<ClientPaymentObject> = isPaid
            ? { $set: { "downPayment.isPaid": true, "downPayment.paidAt": event.occurredAt, "downPayment.settlementSource": "manual", "downPayment.settlementReceiptId": event.receiptId, hasReceiptHistory: true, status }, $unset: { "downPayment.pix": 1 } }
            : { $set: { "downPayment.isPaid": false, status }, $unset: { "downPayment.paidAt": 1, "downPayment.settlementSource": 1, "downPayment.settlementReceiptId": 1, "downPayment.pix": 1 } };
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), ...(isPaid ? { "downPayment.amountCents": { $gt: 0 } } : {}) },
            { ...settlementUpdate, $inc: { __v: 1 } },
            event
        );
    }

    setInstallmentPaid(id: string, clientId: string, version: number, number: number, isPaid: boolean, event: PaymentAuditEvent, status: ChargeStatus) {
        const settlementUpdate: UpdateQuery<ClientPaymentObject> = isPaid
            ? { $set: { "installments.$.isPaid": true, "installments.$.paidAt": event.occurredAt, "installments.$.settlementSource": "manual", "installments.$.settlementReceiptId": event.receiptId, hasReceiptHistory: true, status }, $unset: { "installments.$.pix": 1 } }
            : { $set: { "installments.$.isPaid": false, status }, $unset: { "installments.$.paidAt": 1, "installments.$.settlementSource": 1, "installments.$.settlementReceiptId": 1, "installments.$.pix": 1 } };
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), "installments.number": number },
            { ...settlementUpdate, $inc: { __v: 1 } },
            event
        );
    }

    setDownPaymentPix(id: string, clientId: string, version: number, pix: PixPaymentRequest, event: PaymentAuditEvent) {
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), "downPayment.isPaid": false, "downPayment.amountCents": { $gt: 0 } },
            { $set: { "downPayment.pix": pix }, $inc: { __v: 1 } },
            event
        );
    }

    setInstallmentPix(id: string, clientId: string, version: number, number: number, pix: PixPaymentRequest, event: PaymentAuditEvent) {
        return mutateWithEvent(
            { _id: id, clientId, archivedAt: null, ...versionFilter(version), installments: { $elemMatch: { number, isPaid: false } } },
            { $set: { "installments.$[installment].pix": pix }, $inc: { __v: 1 } },
            event,
            { arrayFilters: [{ "installment.number": number, "installment.isPaid": false }] }
        );
    }
}

async function mutateWithEvent(
    filter: Record<string, unknown>,
    update: UpdateQuery<ClientPaymentObject>,
    event: PaymentAuditEvent,
    options: QueryOptions = {}
) {
    return inTransaction(async session => {
        const updated = await payments.findOneAndUpdate(filter, update, {
            ...options,
            new: true,
            runValidators: true,
            session
        });
        if (updated) await appendFinancialEvent(updated, event, session);
        return updated;
    });
}

async function inTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(() => operation(session));
    } finally {
        await session.endSession();
    }
}

async function appendFinancialEvent(payment: ClientPaymentObject, event: PaymentAuditEvent, session: ClientSession): Promise<void> {
    const typeByAuditEvent: Record<PaymentAuditEvent["type"], FinancialEventType> = {
        created: "charge-created",
        "terms-updated": "charge-terms-updated",
        "manual-status-change": event.isPaid ? "receipt-confirmed" : "receipt-reversed",
        "pix-code-generated": "pix-presented",
        archived: "charge-cancelled"
    };
    const amountCents = event.partType === "down-payment"
        ? payment.downPayment.amountCents
        : payment.installments.find(item => item.number === event.installmentNumber)?.amountCents;
    const financialEvent: FinancialEventObject = {
        eventId: event.eventId,
        paymentId: payment._id,
        clientId: payment.clientId,
        type: typeByAuditEvent[event.type],
        currency: FINANCIAL_CURRENCY,
        timeZone: FINANCIAL_TIME_ZONE,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        actorSessionId: event.actorSessionId,
        actorRole: event.actorRole,
        idempotencySource: event.actorRole === "admin" ? "manual" : "system",
        idempotencyKey: event.eventId,
        ...(event.partType ? { partType: event.partType } : {}),
        ...(event.installmentNumber ? { installmentNumber: event.installmentNumber } : {}),
        ...(amountCents === undefined ? {} : { amountCents }),
        ...(event.receiptId ? { receiptId: event.receiptId } : {}),
        ...(event.reversesReceiptId ? { reversesReceiptId: event.reversesReceiptId } : {}),
        details: auditDetails(event)
    };
    await financialEvents.create([financialEvent], { session });
}

function auditDetails(event: PaymentAuditEvent): Record<string, unknown> {
    const { eventId: _eventId, type: _type, actorId: _actorId, actorSessionId: _sessionId,
        actorRole: _role, occurredAt: _occurredAt, receiptId: _receiptId,
        reversesReceiptId: _reversesReceiptId, ...details } = event;
    return details;
}

function versionFilter(version: number) {
    return version === 0
        ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
        : { __v: version };
}
