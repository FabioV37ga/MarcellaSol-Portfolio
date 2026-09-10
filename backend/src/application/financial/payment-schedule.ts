import type { ClientPaymentObject, PaymentInstallment, PaymentPart } from "../../models/clientPayment.js";
import { ApplicationError } from "../errors/application-error.js";
import { integerInRange, paidValue, type PaymentFields } from "./payment-input.js";
export type { PaymentFields } from "./payment-input.js";

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

export interface PaymentSchedulePreview {
    downPaymentCents: number;
    firstDueDate: string;
    installments: Array<{ amountCents: number; dueDate: string }>;
    finalAmountCents: number;
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
    const downPaymentIsPaid = downPaymentAmountCents > 0
        && suppliedPaidValue(fields.downPaymentIsPaid, previous?.downPayment.isPaid);

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
            isPaid: downPaymentIsPaid,
            dueDate: firstDueDate,
            ...settlementMetadata(downPaymentIsPaid, previous?.downPayment, calculatedAt)
        },
        financedAmountCents,
        interestAmountCents,
        installmentTotalCents,
        finalAmountCents: downPaymentAmountCents + installmentTotalCents,
        installments
    };
}

export function monthlyDueDate(firstDueDate: string, monthOffset: number): string {
    const [year, month, preferredDay] = firstDueDate.split("-").map(Number);
    const targetFirstDay = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
    const targetYear = targetFirstDay.getUTCFullYear();
    const targetMonth = targetFirstDay.getUTCMonth();
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, targetMonth, Math.min(preferredDay, lastDay))).toISOString().slice(0, 10);
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
