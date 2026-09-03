import mongoose from "mongoose";
import type { ClientPaymentObject, PaymentInstallment } from "../models/clientPayment.js";
import { ClientPaymentRepository, type PaymentData } from "../repositories/client-payment.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ApplicationError } from "./errors/application-error.js";

export interface PaymentFields {
    title?: unknown;
    totalAmount?: unknown;
    installmentCount?: unknown;
    downPaymentPercentage?: unknown;
    discountPercentage?: unknown;
    interestPercentage?: unknown;
    downPaymentIsPaid?: unknown;
    paidInstallmentNumbers?: unknown;
}

export interface PaymentSchedule {
    totalAmountCents: number;
    installmentCount: number;
    downPaymentPercentage: number;
    discountPercentage: number;
    interestPercentage: number;
    discountAmountCents: number;
    downPayment: { amountCents: number; isPaid: boolean };
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
    const previousPaid = new Map(previous?.installments.map(item => [item.number, item.isPaid]) ?? []);
    const baseAmount = Math.floor(installmentTotalCents / installmentCount);
    const remainder = installmentTotalCents % installmentCount;
    const installments = Array.from({ length: installmentCount }, (_, index) => ({
        number: index + 1,
        amountCents: baseAmount + (index < remainder ? 1 : 0),
        isPaid: suppliedPaidNumbers?.has(index + 1) ?? previousPaid.get(index + 1) ?? false
    }));

    return {
        totalAmountCents,
        installmentCount,
        downPaymentPercentage: downPaymentBasisPoints / 100,
        discountPercentage: discountBasisPoints / 100,
        interestPercentage: interestBasisPoints / 100,
        discountAmountCents,
        downPayment: {
            amountCents: downPaymentAmountCents,
            isPaid: downPaymentAmountCents > 0 && suppliedPaidValue(fields.downPaymentIsPaid, previous?.downPayment.isPaid)
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

    async create(clientId: string, fields: PaymentFields) {
        await this.requireClient(clientId);
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule(fields);
        return paymentResponse(await this.payments.create({ clientId: new mongoose.Types.ObjectId(clientId), title, ...schedule }));
    }

    async edit(clientId: string, paymentId: string, fields: PaymentFields) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const existing = await this.payments.findByIdAndClientId(paymentId, clientId);
        if (!existing) throw new ApplicationError("Pagamento não encontrado", 404);
        const title = paymentTitle(fields.title);
        const schedule = calculatePaymentSchedule(fields, existing);
        const updated = await this.payments.update(paymentId, clientId, { title, ...schedule });
        if (!updated) throw new ApplicationError("Pagamento não encontrado", 404);
        return paymentResponse(updated);
    }

    async setDownPaymentPaid(clientId: string, paymentId: string, value: unknown) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const isPaid = paidValue(value);
        const updated = await this.payments.setDownPaymentPaid(paymentId, clientId, isPaid);
        if (!updated) throw new ApplicationError(isPaid ? "Pagamento não encontrado ou sem entrada" : "Pagamento não encontrado", 404);
        return paymentResponse(updated);
    }

    async setInstallmentPaid(clientId: string, paymentId: string, installmentNumber: unknown, value: unknown) {
        this.requirePaymentId(paymentId);
        await this.requireClient(clientId);
        const number = integerInRange(installmentNumber, "A parcela", 1, 120);
        const updated = await this.payments.setInstallmentPaid(paymentId, clientId, number, paidValue(value));
        if (!updated) throw new ApplicationError("Pagamento ou parcela não encontrado", 404);
        return paymentResponse(updated);
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
        clientId: payment.clientId.toString(),
        title: payment.title,
        totalAmountCents: payment.totalAmountCents,
        installmentCount: payment.installmentCount,
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
    if (!Number.isSafeInteger(cents) || cents < 1) throw new ApplicationError("O valor total deve ser maior que zero", 400);
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
