import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import QRCode from "qrcode";
import type { ClientPaymentObject, PaymentAuditEvent, PaymentInstallment, PaymentPart, PaymentTermsSnapshot } from "../models/clientPayment.js";
import { ClientPaymentRepository } from "../repositories/client-payment.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ApplicationError } from "./errors/application-error.js";
import { generatePixBrCode } from "../services/pix-br-code.js";

const PIX_ACCESS_WINDOW_MS = 5 * 60 * 60 * 1000;
const PIX_RECEIVER = {
    key: process.env.PIX_RECEIVER_KEY?.trim() || "52685132813",
    name: process.env.PIX_RECEIVER_NAME?.trim() || "MARCELLA SOL",
    city: process.env.PIX_RECEIVER_CITY?.trim() || "SAO PAULO"
};

export interface PaymentFields {
    title?: unknown;
    totalAmount?: unknown;
    installmentCount?: unknown;
    firstDueDate?: unknown;
    downPaymentPercentage?: unknown;
    discountPercentage?: unknown;
    interestPercentage?: unknown;
    downPaymentIsPaid?: unknown;
    paidInstallmentNumbers?: unknown;
    version?: unknown;
}

export interface PaymentActor {
    id: string;
    sessionId: string;
    role: "admin" | "client";
}

export interface PaymentSchedule {
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
}

export function calculatePaymentSchedule(
    fields: PaymentFields,
    previous?: Pick<ClientPaymentObject, "downPayment" | "installments">
): PaymentSchedule {
    const totalAmountCents = moneyToCents(fields.totalAmount);
    const installmentCount = integerInRange(fields.installmentCount, "A quantidade de parcelas", 1, 120);
    const firstDueDate = dateOnly(fields.firstDueDate);
    const downPaymentBasisPoints = percentageBasisPoints(fields.downPaymentPercentage, "A entrada");
    const discountBasisPoints = percentageBasisPoints(fields.discountPercentage, "O desconto");
    const interestBasisPoints = percentageBasisPoints(fields.interestPercentage, "Os juros");
    const discountAmountCents = percentageOf(totalAmountCents, discountBasisPoints);
    const discountedAmountCents = totalAmountCents - discountAmountCents;
    const downPaymentAmountCents = percentageOf(discountedAmountCents, downPaymentBasisPoints);
    const financedAmountCents = discountedAmountCents - downPaymentAmountCents;
    const interestAmountCents = percentageOf(financedAmountCents, interestBasisPoints);
    const installmentTotalCents = financedAmountCents + interestAmountCents;
    const suppliedPaidNumbers = paidInstallmentNumbers(fields.paidInstallmentNumbers, installmentCount);
    const previousInstallments = new Map(previous?.installments.map(item => [item.number, item]) ?? []);
    const calculatedAt = new Date();
    const baseAmount = Math.floor(installmentTotalCents / installmentCount);
    const remainder = installmentTotalCents % installmentCount;
    const installments = Array.from({ length: installmentCount }, (_, index) => {
        const previousInstallment = previousInstallments.get(index + 1);
        const isPaid = suppliedPaidNumbers?.has(index + 1) ?? previousInstallment?.isPaid ?? false;
        return {
            number: index + 1,
            amountCents: baseAmount + (index < remainder ? 1 : 0),
            isPaid,
            dueDate: monthlyDueDate(firstDueDate, index + 1),
            ...settlementMetadata(isPaid, previousInstallment, calculatedAt)
        };
    });

    return {
        totalAmountCents,
        installmentCount,
        firstDueDate,
        downPaymentPercentage: downPaymentBasisPoints / 100,
        discountPercentage: discountBasisPoints / 100,
        interestPercentage: interestBasisPoints / 100,
        discountAmountCents,
        downPayment: {
            amountCents: downPaymentAmountCents,
            isPaid: downPaymentAmountCents > 0 && suppliedPaidValue(fields.downPaymentIsPaid, previous?.downPayment.isPaid),
            dueDate: firstDueDate,
            ...settlementMetadata(
                downPaymentAmountCents > 0 && suppliedPaidValue(fields.downPaymentIsPaid, previous?.downPayment.isPaid),
                previous?.downPayment,
                calculatedAt
            )
        },
        financedAmountCents,
        interestAmountCents,
        installmentTotalCents,
        finalAmountCents: downPaymentAmountCents + installmentTotalCents,
        installments
    };
}

export class ClientPaymentService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly payments = new ClientPaymentRepository()
    ) {}

    async list(clientId: string) {
        await this.requireClient(clientId);
        return (await this.payments.findByClientId(clientId)).map(paymentResponse);
    }

    async listForClient(clientId: string) {
        await this.requireClient(clientId);
        return (await this.payments.findByClientId(clientId)).map(clientPaymentResponse);
    }

    async create(clientId: string, fields: PaymentFields, actor: PaymentActor) {
        await this.requireClient(clientId);
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule(fields);
        return paymentResponse(await this.payments.create({
            clientId: new mongoose.Types.ObjectId(clientId),
            title,
            ...schedule,
            events: [auditEvent("created", actor, { after: termsSnapshot(title, schedule) })]
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
        const schedule = calculatePaymentSchedule(fields, existing);
        const event = auditEvent("terms-updated", actor, {
            before: termsSnapshot(existing.title, existing),
            after: termsSnapshot(title, schedule)
        });
        const updated = await this.payments.update(paymentId, clientId, version, { title, ...schedule }, event);
        if (!updated) throw conflictError();
        return paymentResponse(updated);
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
            isPaid
        });
        const updated = await this.payments.setDownPaymentPaid(paymentId, clientId, version, isPaid, event);
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
            isPaid
        });
        const updated = await this.payments.setInstallmentPaid(paymentId, clientId, version, number, isPaid, event);
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

        const now = new Date();
        if (part.pix && part.pix.expiresAt.getTime() > now.getTime()) {
            return pixResponse(existing, partType, installmentNumber, part, await pixQrCode(part.pix.brCode));
        }

        const txid = randomUUID().replace(/-/g, "").slice(0, 25);
        const generatedAt = now;
        const expiresAt = new Date(now.getTime() + PIX_ACCESS_WINDOW_MS);
        const pix = { txid, brCode: generatePixBrCode(part.amountCents, txid, PIX_RECEIVER), generatedAt, expiresAt };
        const event = auditEvent("pix-code-generated", actor, {
            partType,
            ...(installmentNumber === undefined ? {} : { installmentNumber }),
            pixTxid: txid,
            pixExpiresAt: expiresAt
        });
        const version = existing.__v ?? 0;
        const updated = partType === "down-payment"
            ? await this.payments.setDownPaymentPix(paymentId, clientId, version, pix, event)
            : await this.payments.setInstallmentPix(paymentId, clientId, version, installmentNumber!, pix, event);
        if (!updated) throw conflictError();
        const updatedPart = partType === "down-payment"
            ? updated.downPayment
            : updated.installments.find(item => item.number === installmentNumber)!;
        return pixResponse(updated, partType, installmentNumber, updatedPart, await pixQrCode(pix.brCode));
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

function paymentResponse(payment: ClientPaymentObject) {
    const paidAmountCents = (payment.downPayment.isPaid ? payment.downPayment.amountCents : 0)
        + payment.installments.reduce((total, item) => total + (item.isPaid ? item.amountCents : 0), 0);
    return {
        id: payment._id.toString(),
        version: payment.__v ?? 0,
        clientId: payment.clientId.toString(),
        title: payment.title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
        firstDueDate: payment.firstDueDate,
        downPaymentPercentage: payment.downPaymentPercentage,
        discountPercentage: payment.discountPercentage,
        interestPercentage: payment.interestPercentage,
        discountAmountCents: payment.discountAmountCents,
        downPayment: payment.downPayment,
        financedAmountCents: payment.financedAmountCents,
        interestAmountCents: payment.interestAmountCents,
        installmentTotalCents: payment.installmentTotalCents,
        finalAmountCents: payment.finalAmountCents,
        paidAmountCents,
        remainingAmountCents: Math.max(0, payment.finalAmountCents - paidAmountCents),
        installments: payment.installments,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    };
}

function clientPaymentResponse(payment: ClientPaymentObject) {
    const response = paymentResponse(payment);
    return {
        id: response.id,
        title: response.title,
        totalAmountCents: response.totalAmountCents,
        installmentCount: response.installmentCount,
        firstDueDate: response.firstDueDate,
        downPaymentPercentage: response.downPaymentPercentage,
        discountPercentage: response.discountPercentage,
        interestPercentage: response.interestPercentage,
        discountAmountCents: response.discountAmountCents,
        downPayment: publicPaymentPart(response.downPayment),
        finalAmountCents: response.finalAmountCents,
        paidAmountCents: response.paidAmountCents,
        remainingAmountCents: response.remainingAmountCents,
        installments: response.installments.map(item => ({ number: item.number, ...publicPaymentPart(item) })),
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
    };
}

function publicPaymentPart(part: PaymentPart) {
    const hasActivePix = !part.isPaid && part.pix && part.pix.expiresAt.getTime() > Date.now();
    return {
        amountCents: part.amountCents,
        isPaid: part.isPaid,
        dueDate: part.dueDate,
        ...(hasActivePix ? { pix: { generatedAt: part.pix!.generatedAt, expiresAt: part.pix!.expiresAt } } : {})
    };
}

function pixPartType(value: unknown): "down-payment" | "installment" {
    if (value !== "down-payment" && value !== "installment") {
        throw new ApplicationError("O tipo do pagamento é inválido", 400);
    }
    return value;
}

async function pixQrCode(brCode: string): Promise<string> {
    return QRCode.toDataURL(brCode, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}

function pixResponse(
    payment: ClientPaymentObject,
    partType: "down-payment" | "installment",
    installmentNumber: number | undefined,
    part: PaymentPart,
    qrCodeDataUrl: string
) {
    return {
        payment: clientPaymentResponse(payment),
        pix: {
            partType,
            ...(installmentNumber === undefined ? {} : { installmentNumber }),
            amountCents: part.amountCents,
            brCode: part.pix!.brCode,
            qrCodeDataUrl,
            generatedAt: part.pix!.generatedAt,
            expiresAt: part.pix!.expiresAt
        }
    };
}

function paymentTitle(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) throw new ApplicationError("O título é obrigatório", 400);
    const title = value.trim();
    if (title.length > 160) throw new ApplicationError("O título deve ter no máximo 160 caracteres", 400);
    return title;
}

function moneyToCents(value: unknown): number {
    const normalized = typeof value === "number" ? value.toString() : typeof value === "string" ? value.trim() : "";
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) throw new ApplicationError("O valor total é inválido", 400);
    const [whole, decimal = ""] = normalized.replace(",", ".").split(".");
    const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
    if (!Number.isSafeInteger(cents) || cents < 1 || cents > 99_999_999_999) {
        throw new ApplicationError("O valor total deve estar entre R$ 0,01 e R$ 999.999.999,99", 400);
    }
    return cents;
}

function percentageBasisPoints(value: unknown, label: string): number {
    if (value === undefined || value === null || value === "") return 0;
    const normalized = typeof value === "number" ? value.toString() : typeof value === "string" ? value.trim() : "";
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) throw new ApplicationError(`${label} deve ser uma porcentagem válida`, 400);
    const percentage = Number(normalized.replace(",", "."));
    if (percentage < 0 || percentage > 100) throw new ApplicationError(`${label} deve estar entre 0 e 100%`, 400);
    return Math.round(percentage * 100);
}

function percentageOf(amountCents: number, basisPoints: number): number {
    return Math.round(amountCents * basisPoints / 10_000);
}

function integerInRange(value: unknown, label: string, minimum: number, maximum: number): number {
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new ApplicationError(`${label} deve ser um número inteiro entre ${minimum} e ${maximum}`, 400);
    }
    return parsed;
}

function paidValue(value: unknown): boolean {
    if (typeof value !== "boolean") throw new ApplicationError("O status de pagamento deve ser verdadeiro ou falso", 400);
    return value;
}

function paymentVersion(value: unknown): number {
    if (!Number.isInteger(value) || (value as number) < 0) {
        throw new ApplicationError("A versão do pagamento é obrigatória", 400);
    }
    return value as number;
}

function conflictError(): ApplicationError {
    return new ApplicationError("Este pagamento foi alterado em outra sessão. Atualize a página e tente novamente", 409);
}

function settlementMetadata(isPaid: boolean, previous: PaymentPart | undefined, occurredAt: Date) {
    if (!isPaid) return {};
    if (previous?.isPaid) {
        return {
            ...(previous.paidAt ? { paidAt: previous.paidAt } : {}),
            settlementSource: previous.settlementSource ?? "manual" as const
        };
    }
    return { paidAt: occurredAt, settlementSource: "manual" as const };
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
    details: Omit<PaymentAuditEvent, "eventId" | "type" | "actorId" | "actorSessionId" | "actorRole" | "occurredAt">
): PaymentAuditEvent {
    return {
        eventId: randomUUID(),
        type,
        actorId: actor.id,
        actorSessionId: actor.sessionId,
        actorRole: actor.role,
        occurredAt: new Date(),
        ...details
    };
}

function suppliedPaidValue(value: unknown, fallback = false): boolean {
    if (value === undefined) return fallback;
    return paidValue(value);
}

function paidInstallmentNumbers(value: unknown, installmentCount: number): Set<number> | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some(number => !Number.isInteger(number) || number < 1 || number > installmentCount)) {
        throw new ApplicationError("Os status das parcelas são inválidos", 400);
    }
    return new Set(value as number[]);
}

function dateOnly(value: unknown): string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ApplicationError("A data da primeira cobrança é obrigatória", 400);
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new ApplicationError("A data da primeira cobrança é inválida", 400);
    }
    return value;
}

export function monthlyDueDate(firstDueDate: string, monthOffset: number): string {
    const [year, month, preferredDay] = firstDueDate.split("-").map(Number);
    const targetFirstDay = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
    const targetYear = targetFirstDay.getUTCFullYear();
    const targetMonth = targetFirstDay.getUTCMonth();
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const dueDate = new Date(Date.UTC(targetYear, targetMonth, Math.min(preferredDay, lastDay)));
    return dueDate.toISOString().slice(0, 10);
}
