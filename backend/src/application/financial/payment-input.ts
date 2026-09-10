import { ApplicationError } from "../errors/application-error.js";

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

export function paymentTitle(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) throw new ApplicationError("O título é obrigatório", 400);
    const title = value.trim();
    if (title.length > 160) throw new ApplicationError("O título deve ter no máximo 160 caracteres", 400);
    return title;
}

export function integerInRange(value: unknown, label: string, minimum: number, maximum: number): number {
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new ApplicationError(`${label} deve ser um número inteiro entre ${minimum} e ${maximum}`, 400);
    }
    return parsed;
}

export function paidValue(value: unknown): boolean {
    if (typeof value !== "boolean") throw new ApplicationError("O status de pagamento deve ser verdadeiro ou falso", 400);
    return value;
}

export function paymentVersion(value: unknown): number {
    if (!Number.isInteger(value) || (value as number) < 0) {
        throw new ApplicationError("A versão do pagamento é obrigatória", 400);
    }
    return value as number;
}

export function pixPartType(value: unknown): "down-payment" | "installment" {
    if (value !== "down-payment" && value !== "installment") {
        throw new ApplicationError("O tipo do pagamento é inválido", 400);
    }
    return value;
}
