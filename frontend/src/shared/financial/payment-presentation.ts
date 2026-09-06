export type FinancialClock = () => Date;

export interface FinancialPixWindow {
    expiresAt: string;
}

export interface FinancialPart {
    amountCents: number;
    isPaid: boolean;
    dueDate?: string;
    pix?: FinancialPixWindow;
}

export interface FinancialInstallment extends FinancialPart {
    number: number;
}

export interface FinancialPayment {
    id: string;
    title: string;
    firstDueDate?: string;
    downPayment: FinancialPart;
    installments: FinancialInstallment[];
}

export interface HighlightedPaymentPart {
    paymentId: string;
    paymentTitle: string;
    partType: "down-payment" | "installment";
    installmentNumber?: number;
    label: string;
    amountCents: number;
    dueDate: string;
    isPaid: boolean;
    pix?: FinancialPixWindow;
    hasActivePix: boolean;
}

export interface PaymentPartStatus {
    kind: "paid" | "pending" | "overdue" | "analysis";
    listLabel: string;
    timeLabel: string;
    highlightLabel: string;
}

export const systemFinancialClock: FinancialClock = () => new Date();

export function selectHighlightedPaymentPart(
    payments: FinancialPayment[],
    clock: FinancialClock = systemFinancialClock
): HighlightedPaymentPart | undefined {
    const now = clock();
    const parts = payments.reduce<HighlightedPaymentPart[]>((entries, payment) => {
        const entryDate = payment.downPayment.dueDate ?? payment.firstDueDate;
        if (payment.downPayment.amountCents > 0 && entryDate && isDateOnly(entryDate)) {
            entries.push(reference(payment, payment.downPayment, "down-payment", "Entrada", entryDate, now));
        }
        payment.installments.forEach(part => {
            if (part.dueDate && isDateOnly(part.dueDate)) {
                entries.push(reference(payment, part, "installment", `Parcela ${part.number}`, part.dueDate, now, part.number));
            }
        });
        return entries;
    }, []).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (!parts.length) return undefined;
    const todayValue = localDateValue(now);
    const overdue = parts.find(part => !part.isPaid && dateValue(part.dueDate) < todayValue);
    if (overdue) return overdue;

    const currentMonth = parts.filter(part => {
        const [year, month] = part.dueDate.split("-").map(Number);
        return year === now.getFullYear() && month === now.getMonth() + 1;
    });
    const current = currentMonth.find(part => !part.isPaid) ?? currentMonth[currentMonth.length - 1];
    if (current && !current.isPaid) return current;

    const next = parts.find(part => dateValue(part.dueDate) > todayValue && !part.isPaid);
    if (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28
        && parts.filter(part => dateValue(part.dueDate) < dateValue(next.dueDate)).every(part => part.isPaid)) {
        return next;
    }
    if (current) return current;
    return [...parts].reverse().find(part => dateValue(part.dueDate) <= todayValue)
        ?? (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28 ? next : undefined);
}

export function paymentPartStatus(
    dueDate: string | undefined,
    isPaid: boolean,
    pix?: FinancialPixWindow,
    clock: FinancialClock = systemFinancialClock
): PaymentPartStatus {
    if (isPaid) {
        return { kind: "paid", listLabel: "Pago", timeLabel: "Pago", highlightLabel: "Pagamento confirmado" };
    }
    const now = clock();
    if (isActivePix(pix, now)) {
        return {
            kind: "analysis",
            listLabel: "Em análise",
            timeLabel: "Aguardando confirmação",
            highlightLabel: "Pagamento em análise"
        };
    }
    if (!dueDate || !isDateOnly(dueDate)) {
        return {
            kind: "pending",
            listLabel: "Pendente",
            timeLabel: "Data não informada",
            highlightLabel: "Data não informada"
        };
    }
    const difference = daysBetween(localDateValue(now), dateValue(dueDate));
    if (difference < 0) {
        const days = Math.abs(difference);
        return {
            kind: "overdue",
            listLabel: "Atrasado",
            timeLabel: days === 1 ? "Vencida há 1 dia" : `Vencida há ${days} dias`,
            highlightLabel: days === 1 ? "Atrasado há 1 dia" : `Atrasado há ${days} dias`
        };
    }
    const timeLabel = difference === 0 ? "Vence hoje" : difference === 1 ? "Falta 1 dia" : `Faltam ${difference} dias`;
    return { kind: "pending", listLabel: "Pendente", timeLabel, highlightLabel: timeLabel };
}

export function paymentHasActivePix(
    payment: FinancialPayment,
    clock: FinancialClock = systemFinancialClock
): boolean {
    const now = clock();
    return [payment.downPayment, ...payment.installments].some(part => !part.isPaid && isActivePix(part.pix, now));
}

export function paymentHasOverduePart(
    payment: FinancialPayment,
    clock: FinancialClock = systemFinancialClock
): boolean {
    const now = clock();
    const today = localDateValue(now);
    return [payment.downPayment, ...payment.installments].some(part => part.amountCents > 0
        && !part.isPaid
        && !isActivePix(part.pix, now)
        && Boolean(part.dueDate && isDateOnly(part.dueDate) && dateValue(part.dueDate) < today));
}

export function dueDateLabel(
    dueDate: string | undefined,
    isPaid: boolean,
    clock: FinancialClock = systemFinancialClock
): string {
    return paymentPartStatus(dueDate, isPaid, undefined, clock).timeLabel;
}

export function isOverdue(dueDate: string | undefined, clock: FinancialClock = systemFinancialClock): boolean {
    if (!dueDate || !isDateOnly(dueDate)) return false;
    return dateValue(dueDate) < localDateValue(clock());
}

function reference(
    payment: FinancialPayment,
    part: FinancialPart,
    partType: HighlightedPaymentPart["partType"],
    label: string,
    dueDate: string,
    now: Date,
    installmentNumber?: number
): HighlightedPaymentPart {
    return {
        paymentId: payment.id,
        paymentTitle: payment.title,
        partType,
        installmentNumber,
        label,
        amountCents: part.amountCents,
        dueDate,
        isPaid: part.isPaid,
        pix: part.pix,
        hasActivePix: isActivePix(part.pix, now)
    };
}

function isActivePix(pix: FinancialPixWindow | undefined, now: Date): boolean {
    return Boolean(pix && new Date(pix.expiresAt).getTime() > now.getTime());
}

function isDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateValue(value: string): number {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}

function localDateValue(value: Date): number {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysBetween(from: number, to: number): number {
    return Math.round((to - from) / 86_400_000);
}
