import type { ClientPayment } from "../infrastructure/client-system.api.js";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface HighlightedPaymentPart {
    paymentTitle: string;
    label: string;
    amountCents: number;
    dueDate: string;
    isPaid: boolean;
}

export function clientPaymentHighlight(payments: ClientPayment[]): HTMLElement {
    const highlighted = selectHighlightedPaymentPart(payments);
    if (!highlighted) {
        const empty = document.createElement("p");
        empty.className = "client-financial-highlight-empty";
        empty.textContent = "Nenhum vencimento programado no momento.";
        return empty;
    }

    const content = document.createElement("article");
    content.className = "client-financial-highlight-payment";
    const main = document.createElement("div");
    main.className = "client-financial-highlight-main";
    const context = document.createElement("span");
    context.textContent = highlighted.paymentTitle;
    const title = document.createElement("h3");
    title.textContent = highlighted.label;
    const countdown = document.createElement("strong");
    const status = paymentPartStatus(highlighted.dueDate, highlighted.isPaid);
    countdown.className = `client-financial-highlight-countdown is-${status.kind}`;
    countdown.textContent = status.highlightLabel;
    main.append(context, title, countdown);

    const details = document.createElement("div");
    details.className = "client-financial-highlight-details";
    details.append(
        highlightDetail("Data", formatDate(highlighted.dueDate)),
        highlightDetail("Valor", formatMoney(highlighted.amountCents))
    );
    content.append(main, details);
    return content;
}

export function selectHighlightedPaymentPart(
    payments: ClientPayment[],
    today = new Date()
): HighlightedPaymentPart | undefined {
    const parts = payments.reduce<HighlightedPaymentPart[]>((entries, payment) => {
        const entryDate = payment.downPayment.dueDate ?? payment.firstDueDate;
        if (payment.downPayment.amountCents > 0 && entryDate && isDateOnly(entryDate)) {
            entries.push({
                paymentTitle: payment.title,
                label: "Entrada",
                amountCents: payment.downPayment.amountCents,
                dueDate: entryDate,
                isPaid: payment.downPayment.isPaid
            });
        }
        payment.installments.forEach(installment => {
            if (!installment.dueDate || !isDateOnly(installment.dueDate)) return;
            entries.push({
                paymentTitle: payment.title,
                label: `Parcela ${installment.number}`,
                amountCents: installment.amountCents,
                dueDate: installment.dueDate,
                isPaid: installment.isPaid
            });
        });
        return entries;
    }, []).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    if (parts.length === 0) return undefined;

    const todayValue = localDateValue(today);
    const overdue = parts.find(part => !part.isPaid && dateValue(part.dueDate) < todayValue);
    if (overdue) return overdue;

    const currentMonth = parts.filter(part => {
        const [year, month] = part.dueDate.split("-").map(Number);
        return year === today.getFullYear() && month === today.getMonth() + 1;
    });
    const current = currentMonth.find(part => !part.isPaid) ?? currentMonth[currentMonth.length - 1];
    if (current && !current.isPaid) return current;

    const next = parts.find(part => dateValue(part.dueDate) > todayValue && !part.isPaid);
    if (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28) {
        const previousArePaid = parts
            .filter(part => dateValue(part.dueDate) < dateValue(next.dueDate))
            .every(part => part.isPaid);
        if (previousArePaid) return next;
    }
    if (current) return current;

    const lastReached = [...parts].reverse().find(part => dateValue(part.dueDate) <= todayValue);
    return lastReached ?? (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28 ? next : undefined);
}

export function clientPaymentItem(payment: ClientPayment): HTMLElement {
    const card = document.createElement("article");
    card.className = "client-financial-payment";

    const header = document.createElement("header");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = payment.title;
    const conditions = document.createElement("p");
    conditions.textContent = conditionsText(payment);
    heading.append(title, conditions);
    const status = document.createElement("span");
    const settled = payment.remainingAmountCents === 0;
    const overdue = !settled && paymentHasOverduePart(payment);
    status.className = `client-financial-payment-status ${settled ? "is-settled" : overdue ? "is-overdue" : "is-pending"}`;
    status.textContent = settled ? "Quitado" : overdue ? "Com atraso" : "Em aberto";
    header.append(heading, status);

    const summary = document.createElement("div");
    summary.className = "client-financial-summary";
    summary.append(
        summaryItem("Valor final", payment.finalAmountCents),
        summaryItem("Valor pago", payment.paidAmountCents),
        summaryItem("Saldo restante", payment.remainingAmountCents, true)
    );

    const progress = document.createElement("div");
    progress.className = "client-financial-progress";
    const percentage = payment.finalAmountCents > 0
        ? Math.min(100, payment.paidAmountCents / payment.finalAmountCents * 100) : 0;
    const bar = document.createElement("span");
    bar.style.width = `${percentage}%`;
    progress.append(bar);
    progress.setAttribute("aria-label", `${Math.round(percentage)}% pago`);

    const partsTitle = document.createElement("h4");
    partsTitle.textContent = "Entrada e parcelas";
    const parts = document.createElement("div");
    parts.className = "client-financial-parts";
    if (payment.downPayment.amountCents > 0) {
        parts.append(partItem(
            "Entrada",
            payment.downPayment.amountCents,
            payment.downPayment.isPaid,
            payment.downPayment.dueDate ?? payment.firstDueDate
        ));
    }
    payment.installments.forEach(installment => {
        parts.append(partItem(`Parcela ${installment.number}`, installment.amountCents, installment.isPaid, installment.dueDate));
    });
    card.append(header, summary, progress, partsTitle, parts);
    return card;
}

function summaryItem(label: string, amountCents: number, highlight = false): HTMLElement {
    const item = document.createElement("span");
    if (highlight) item.className = "client-financial-summary-highlight";
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = formatMoney(amountCents);
    item.append(small, strong);
    return item;
}

function partItem(label: string, amountCents: number, isPaid: boolean, dueDate?: string): HTMLElement {
    const item = document.createElement("div");
    item.className = "client-financial-part";
    const description = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = dueDate ? `${label} | ${formatDate(dueDate)}` : label;
    const amount = document.createElement("small");
    amount.textContent = `${formatMoney(amountCents)} · ${dueDateLabel(dueDate, isPaid)}`;
    description.append(name, amount);
    const status = document.createElement("em");
    const paymentStatus = paymentPartStatus(dueDate, isPaid);
    status.className = `is-${paymentStatus.kind}`;
    status.textContent = paymentStatus.listLabel;
    item.append(description, status);
    return item;
}

function conditionsText(payment: ClientPayment): string {
    const conditions = [`${payment.installmentCount} parcela${payment.installmentCount === 1 ? "" : "s"}`];
    if (payment.downPaymentPercentage > 0) conditions.push(`${formatPercentage(payment.downPaymentPercentage)} de entrada`);
    if (payment.discountPercentage > 0) conditions.push(`${formatPercentage(payment.discountPercentage)} de desconto`);
    if (payment.interestPercentage > 0) conditions.push(`${formatPercentage(payment.interestPercentage)} de juros`);
    return conditions.join(" · ");
}

function paymentHasOverduePart(payment: ClientPayment): boolean {
    const today = localDateValue(new Date());
    const entryDate = payment.downPayment.dueDate ?? payment.firstDueDate;
    if (payment.downPayment.amountCents > 0 && !payment.downPayment.isPaid
        && entryDate && isDateOnly(entryDate) && dateValue(entryDate) < today) return true;
    return payment.installments.some(installment => !installment.isPaid && installment.dueDate
        && isDateOnly(installment.dueDate) && dateValue(installment.dueDate) < today);
}

function formatMoney(amountCents: number): string { return currency.format(amountCents / 100); }
function formatPercentage(value: number): string {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function dueDateLabel(value: string | undefined, isPaid: boolean): string {
    return paymentPartStatus(value, isPaid).timeLabel;
}

function paymentPartStatus(value: string | undefined, isPaid: boolean): {
    kind: "paid" | "pending" | "overdue";
    listLabel: string;
    timeLabel: string;
    highlightLabel: string;
} {
    if (isPaid) return { kind: "paid", listLabel: "Pago", timeLabel: "Pago", highlightLabel: "Pagamento confirmado" };
    if (!value || !isDateOnly(value)) {
        return { kind: "pending", listLabel: "Pendente", timeLabel: "Data não informada", highlightLabel: "Data não informada" };
    }
    const difference = daysBetween(localDateValue(new Date()), dateValue(value));
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

function highlightDetail(label: string, value: string): HTMLElement {
    const item = document.createElement("span");
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    item.append(small, strong);
    return item;
}

function isDateOnly(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function dateValue(value: string): number {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}
function localDateValue(value: Date): number {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}
function daysBetween(from: number, to: number): number { return Math.round((to - from) / 86_400_000); }
