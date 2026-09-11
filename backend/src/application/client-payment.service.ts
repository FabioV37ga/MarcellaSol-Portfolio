import mongoose from "mongoose";
import type { ClientPaymentObject, PaymentAuditEvent, PaymentTermsSnapshot } from "../models/clientPayment.js";
import { ClientPaymentRepository } from "../repositories/client-payment.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ApplicationError } from "./errors/application-error.js";
import type { PixReceiver } from "../services/pix-br-code.js";
import { chargeStatus, FINANCIAL_CURRENCY, FINANCIAL_TIME_ZONE } from "../domain/financial-domain.js";
import {
    calculatePaymentSchedule,
    type PaymentSchedule,
    type PaymentSchedulePreview
} from "./financial/payment-schedule.js";
import {
    integerInRange,
    paidValue,
    paymentTitle,
    paymentVersion,
    pixPartType,
    type PaymentFields
} from "./financial/payment-input.js";
import {
    clientPaymentResponse,
    hasConfirmedReceiptHistory,
    paymentResponse
} from "./financial/payment-presenter.js";
import { loadPaymentPage, paymentPageOptions, paymentPageResponse } from "./financial/payment-pagination.js";
import { PixPresentationService } from "./financial/pix-presentation.service.js";
import type { Clock } from "./ports/clock.js";
import type { IdGenerator } from "./ports/id-generator.js";
export { calculatePaymentSchedule, monthlyDueDate } from "./financial/payment-schedule.js";
export type { PaymentSchedule, PaymentSchedulePreview } from "./financial/payment-schedule.js";
export type { PaymentFields } from "./financial/payment-input.js";

export interface PaymentActor {
    id: string;
    sessionId: string;
    role: "admin" | "client";
}

export class ClientPaymentService {
    constructor(
        private readonly pixReceiver: PixReceiver,
        private readonly clients: ClientRepository,
        private readonly payments: ClientPaymentRepository,
        private readonly pixPresentation: PixPresentationService,
        private readonly clock: Clock,
        private readonly ids: IdGenerator
    ) { }

    preview(fields: PaymentFields): PaymentSchedulePreview {
        const schedule = calculatePaymentSchedule(fields, undefined, this.clock.now());
        return {
            downPaymentCents: schedule.downPayment.amountCents,
            firstDueDate: schedule.firstDueDate,
            installments: schedule.installments.map(({ amountCents, dueDate }) => ({ amountCents, dueDate })),
            finalAmountCents: schedule.finalAmountCents
        };
    }

    async list(clientId: string, cursorValue?: unknown, limitValue?: unknown) {
        await this.requireClient(clientId);
        const options = paymentPageOptions(cursorValue, limitValue);
        const { page, summary, highlight } = await loadPaymentPage(this.payments, clientId, options, this.clock.now());
        return paymentPageResponse(page, summary, highlight, options.limit, paymentResponse);
    }

    async listForClient(clientId: string, cursorValue?: unknown, limitValue?: unknown) {
        await this.requireClient(clientId);
        const options = paymentPageOptions(cursorValue, limitValue);
        const now = this.clock.now();
        const { page, summary, highlight } = await loadPaymentPage(this.payments, clientId, options, now);
        return paymentPageResponse(page, summary, highlight, options.limit, payment => clientPaymentResponse(payment, now));
    }

    async create(clientId: string, fields: PaymentFields, actor: PaymentActor) {
        await this.requireClient(clientId);
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule({
            ...fields,
            downPaymentIsPaid: undefined,
            paidInstallmentNumbers: undefined
        }, undefined, this.clock.now());
        return paymentResponse(await this.payments.create({
            clientId: new mongoose.Types.ObjectId(clientId),
            title,
            ...schedule,
            currency: FINANCIAL_CURRENCY,
            timeZone: FINANCIAL_TIME_ZONE,
            status: "open",
            hasReceiptHistory: false,
            events: [auditEvent("created", actor, { after: termsSnapshot(title, schedule) }, this.ids, this.clock)]
        }));
    }

    async edit(clientId: string, paymentId: string, fields: PaymentFields, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        const version = paymentVersion(fields.version);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule({
            ...fields,
            downPaymentIsPaid: undefined,
            paidInstallmentNumbers: undefined
        }, existing, this.clock.now());
        if (hasConfirmedReceiptHistory(existing) && financialTermsChanged(existing, schedule)) {
            throw new ApplicationError(
                "As condições financeiras não podem ser alteradas depois da confirmação de um recebimento",
                409
            );
        }
        if (hasConfirmedReceiptHistory(existing)) preservePixAttempts(schedule, existing);
        const event = auditEvent("terms-updated", actor, {
            before: termsSnapshot(existing.title, existing),
            after: termsSnapshot(title, schedule)
        }, this.ids, this.clock);
        const updated = await this.payments.update(paymentId, clientId, version, { title, ...schedule }, event);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async remove(
        clientId: string,
        paymentId: string,
        versionValue: unknown,
        confirmedReceiptHistoryAcknowledged: unknown,
        actor: PaymentActor
    ): Promise<void> {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();

        const hadConfirmedReceiptHistory = hasConfirmedReceiptHistory(existing);
        if (hadConfirmedReceiptHistory && confirmedReceiptHistoryAcknowledged !== true) {
            throw new ApplicationError(
                "Confirme explicitamente a remoção do pagamento que possui recebimentos confirmados",
                409
            );
        }

        const event = auditEvent("archived", actor, { hadConfirmedReceiptHistory }, this.ids, this.clock);
        if (!await this.payments.archive(paymentId, clientId, version, event)) throw conflictError();
    }

    async setDownPaymentPaid(clientId: string, paymentId: string, value: unknown, versionValue: unknown, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const isPaid = paidValue(value);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        if (isPaid && existing.downPayment.amountCents === 0) throw new ApplicationError("Este pagamento não possui entrada", 400);
        if (existing.downPayment.isPaid === isPaid) return paymentResponse(existing);
        const event = auditEvent("manual-status-change", actor, {
            partType: "down-payment",
            previousIsPaid: existing.downPayment.isPaid,
            isPaid,
            ...(isPaid
                ? { receiptId: this.ids.generate() }
                : { reversesReceiptId: existing.downPayment.settlementReceiptId ?? legacyReceiptId(paymentId, "down-payment") })
        }, this.ids, this.clock);
        const nextStatus = statusAfterChange(existing, "down-payment", undefined, isPaid);
        const updated = await this.payments.setDownPaymentPaid(paymentId, clientId, version, isPaid, event, nextStatus);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async setInstallmentPaid(clientId: string, paymentId: string, installmentNumber: unknown, value: unknown, versionValue: unknown, actor: PaymentActor) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const number = integerInRange(installmentNumber, "A parcela", 1, 120);
        const isPaid = paidValue(value);
        const version = paymentVersion(versionValue);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        if ((existing.__v ?? 0) !== version) throw conflictError();
        const installment = existing.installments.find(item => item.number === number);
        if (!installment) throw new ApplicationError("Parcela não encontrada", 404);
        if (installment.isPaid === isPaid) return paymentResponse(existing);
        const event = auditEvent("manual-status-change", actor, {
            partType: "installment",
            installmentNumber: number,
            previousIsPaid: installment.isPaid,
            isPaid,
            ...(isPaid
                ? { receiptId: this.ids.generate() }
                : { reversesReceiptId: installment.settlementReceiptId ?? legacyReceiptId(paymentId, "installment", number) })
        }, this.ids, this.clock);
        const nextStatus = statusAfterChange(existing, "installment", number, isPaid);
        const updated = await this.payments.setInstallmentPaid(paymentId, clientId, version, number, isPaid, event, nextStatus);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
    }

    async generatePix(
        clientId: string,
        paymentId: string,
        partTypeValue: unknown,
        installmentNumberValue: unknown,
        actor: PaymentActor
    ) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        const partType = pixPartType(partTypeValue);
        const installmentNumber = partType === "installment"
            ? integerInRange(installmentNumberValue, "A parcela", 1, 120)
            : undefined;
        const part = partType === "down-payment"
            ? existing.downPayment
            : existing.installments.find(item => item.number === installmentNumber);
        if (!part) throw new ApplicationError("Parcela não encontrada", 404);
        if (part.isPaid) throw new ApplicationError("Este pagamento já foi confirmado", 409);
        if (part.amountCents < 1) throw new ApplicationError("Este pagamento não possui valor para Pix", 400);

        const now = this.clock.now();
        if (this.pixPresentation.isReusable(part.pix, now)) {
            return this.pixPresentation.present(existing, partType, installmentNumber, part, now);
        }

        const pix = this.pixPresentation.createAttempt(part.amountCents, now);
        const event = auditEvent("pix-code-generated", actor, {
            partType,
            ...(installmentNumber === undefined ? {} : { installmentNumber }),
            pixTxid: pix.txid,
            pixAnalysisWindowEndsAt: pix.analysisWindowEndsAt
        }, this.ids, this.clock);
        const version = existing.__v ?? 0;
        const updated = partType === "down-payment"
            ? await this.payments.setDownPaymentPix(paymentId, clientId, version, pix, event)
            : await this.payments.setInstallmentPix(paymentId, clientId, version, installmentNumber!, pix, event);
        if (!updated) throw conflictError();
        const updatedPart = partType === "down-payment"
            ? updated.downPayment
            : updated.installments.find(item => item.number === installmentNumber)!;
        return this.pixPresentation.present(updated, partType, installmentNumber, updatedPart, now);
    }

    private async requireClient(clientId: string): Promise<void> {
        if (!mongoose.isValidObjectId(clientId) || !await this.clients.findById(clientId)) {
            throw new ApplicationError("Cliente não encontrado", 404);
        }
    }

    private requirePaymentId(paymentId: string): void {
        if (!mongoose.isValidObjectId(paymentId)) throw new ApplicationError("Pagamento não encontrado", 404);
    }
}

function financialTermsChanged(payment: ClientPaymentObject, schedule: PaymentSchedule): boolean {
    return payment.totalAmountCents !== schedule.totalAmountCents
        || payment.installmentCount !== schedule.installmentCount
        || payment.firstDueDate !== schedule.firstDueDate
        || payment.downPaymentPercentage !== schedule.downPaymentPercentage
        || payment.discountPercentage !== schedule.discountPercentage
        || payment.interestPercentage !== schedule.interestPercentage
        || payment.discountAmountCents !== schedule.discountAmountCents
        || payment.downPayment.amountCents !== schedule.downPayment.amountCents
        || payment.downPayment.dueDate !== schedule.downPayment.dueDate
        || payment.financedAmountCents !== schedule.financedAmountCents
        || payment.interestAmountCents !== schedule.interestAmountCents
        || payment.installmentTotalCents !== schedule.installmentTotalCents
        || payment.finalAmountCents !== schedule.finalAmountCents
        || payment.installments.length !== schedule.installments.length
        || payment.installments.some((item, index) => {
            const calculated = schedule.installments[index];
            return !calculated || item.number !== calculated.number
                || item.amountCents !== calculated.amountCents
                || item.dueDate !== calculated.dueDate;
        });
}

function preservePixAttempts(schedule: PaymentSchedule, payment: ClientPaymentObject): void {
    if (payment.downPayment.pix) schedule.downPayment.pix = payment.downPayment.pix;
    schedule.installments.forEach((item, index) => {
        const pix = payment.installments[index]?.pix;
        if (pix) item.pix = pix;
    });
}

function statusAfterChange(
    payment: ClientPaymentObject,
    partType: "down-payment" | "installment",
    installmentNumber: number | undefined,
    isPaid: boolean
) {
    const parts = [payment.downPayment, ...payment.installments].map(part => ({ ...part }));
    const index = partType === "down-payment"
        ? 0
        : payment.installments.findIndex(item => item.number === installmentNumber) + 1;
    parts[index].isPaid = isPaid;
    return chargeStatus(parts);
}

function legacyReceiptId(paymentId: string, partType: "down-payment" | "installment", installmentNumber?: number): string {
    return `legacy:${paymentId}:${partType}:${installmentNumber ?? 0}`;
}

function conflictError(): ApplicationError {
    return new ApplicationError("Este pagamento foi alterado em outra sessão. Atualize a página e tente novamente", 409);
}

function termsSnapshot(title: string, payment: PaymentSchedule | ClientPaymentObject): PaymentTermsSnapshot {
    return {
        title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
        firstDueDate: payment.firstDueDate,
        downPaymentPercentage: payment.downPaymentPercentage,
        discountPercentage: payment.discountPercentage,
        interestPercentage: payment.interestPercentage,
        downPaymentIsPaid: payment.downPayment.isPaid,
        paidInstallmentNumbers: payment.installments.filter(item => item.isPaid).map(item => item.number)
    };
}

function auditEvent(
    type: PaymentAuditEvent["type"],
    actor: PaymentActor,
    details: Omit<PaymentAuditEvent, "eventId" | "type" | "actorId" | "actorSessionId" | "actorRole" | "occurredAt">,
    ids: IdGenerator,
    clock: Clock
): PaymentAuditEvent {
    return {
        eventId: ids.generate(),
        type,
        actorId: actor.id,
        actorSessionId: actor.sessionId,
        actorRole: actor.role,
        occurredAt: clock.now(),
        ...details
    };
}
