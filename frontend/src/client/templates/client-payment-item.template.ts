import type { ClientPayment, ClientPaymentPart } from "../infrastructure/client-system.api.js";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export interface PaymentPartReference { paymentId: string; paymentTitle: string; partType: "down-payment" | "installment"; installmentNumber?: number; label: string; amountCents: number; hasActivePix?: boolean; }
type PayHandler = (part: PaymentPartReference) => void;
interface HighlightedPaymentPart extends PaymentPartReference { dueDate: string; isPaid: boolean; pix?: ClientPaymentPart["pix"]; }

export function clientPaymentHighlight(payments: ClientPayment[], onPay?: PayHandler): HTMLElement {
    const highlighted = selectHighlightedPaymentPart(payments);
    if (!highlighted) return el("p", "client-financial-highlight-empty", "Nenhum vencimento programado no momento.");
    const content = el("article", "client-financial-highlight-payment");
    const main = el("div", "client-financial-highlight-main");
    const status = paymentPartStatus(highlighted.dueDate, highlighted.isPaid, highlighted.pix);
    main.append(el("span", "", highlighted.paymentTitle), el("h3", "", highlighted.label), el("strong", `client-financial-highlight-countdown is-${status.kind}`, status.highlightLabel));
    if (!highlighted.isPaid && onPay) main.append(payButton(highlighted, onPay));
    if (status.kind === "analysis") main.append(analysisNotice());
    const details = el("div", "client-financial-highlight-details");
    details.append(detail("Data", formatDate(highlighted.dueDate)), detail("Valor", money(highlighted.amountCents)));
    content.append(main, details);
    return content;
}

export function selectHighlightedPaymentPart(payments: ClientPayment[], today = new Date()): HighlightedPaymentPart | undefined {
    const parts = payments.reduce<HighlightedPaymentPart[]>((entries, payment) => {
        const entryDate = payment.downPayment.dueDate ?? payment.firstDueDate;
        if (payment.downPayment.amountCents > 0 && entryDate && isDateOnly(entryDate)) entries.push(reference(payment, payment.downPayment, "down-payment", "Entrada", entryDate));
        payment.installments.forEach(part => { if (part.dueDate && isDateOnly(part.dueDate)) entries.push(reference(payment, part, "installment", `Parcela ${part.number}`, part.dueDate, part.number)); });
        return entries;
    }, []).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (!parts.length) return undefined;
    const todayValue = localDateValue(today);
    const overdue = parts.find(part => !part.isPaid && dateValue(part.dueDate) < todayValue);
    if (overdue) return overdue;
    const currentMonth = parts.filter(part => { const [year, month] = part.dueDate.split("-").map(Number); return year === today.getFullYear() && month === today.getMonth() + 1; });
    const current = currentMonth.find(part => !part.isPaid) ?? currentMonth[currentMonth.length - 1];
    if (current && !current.isPaid) return current;
    const next = parts.find(part => dateValue(part.dueDate) > todayValue && !part.isPaid);
    if (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28 && parts.filter(part => dateValue(part.dueDate) < dateValue(next.dueDate)).every(part => part.isPaid)) return next;
    if (current) return current;
    return [...parts].reverse().find(part => dateValue(part.dueDate) <= todayValue) ?? (next && daysBetween(todayValue, dateValue(next.dueDate)) <= 28 ? next : undefined);
}

export function clientPaymentItem(payment: ClientPayment, onPay?: PayHandler): HTMLElement {
    const card = el("article", "client-financial-payment");
    const header = document.createElement("header");
    const heading = document.createElement("div");
    heading.append(el("h3", "", payment.title), el("p", "", conditionsText(payment)));
    const settled = payment.remainingAmountCents === 0;
    const overdue = !settled && paymentHasOverduePart(payment);
    const analysis = !settled && !overdue && paymentHasActivePix(payment);
    header.append(heading, el("span", `client-financial-payment-status ${settled ? "is-settled" : overdue ? "is-overdue" : analysis ? "is-analysis" : "is-pending"}`, settled ? "Quitado" : overdue ? "Com atraso" : analysis ? "Em análise" : "Em aberto"));
    const summary = el("div", "client-financial-summary");
    summary.append(summaryItem("Valor final", payment.finalAmountCents), summaryItem("Valor pago", payment.paidAmountCents), summaryItem("Saldo restante", payment.remainingAmountCents, true));
    const progress = el("div", "client-financial-progress");
    const percentage = payment.finalAmountCents > 0 ? Math.min(100, payment.paidAmountCents / payment.finalAmountCents * 100) : 0;
    const bar = document.createElement("span"); bar.style.width = `${percentage}%`; progress.append(bar); progress.setAttribute("aria-label", `${Math.round(percentage)}% pago`);
    const parts = el("div", "client-financial-parts");
    if (payment.downPayment.amountCents > 0) parts.append(partItem(payment, payment.downPayment, "down-payment", "Entrada", onPay));
    payment.installments.forEach(part => parts.append(partItem(payment, part, "installment", `Parcela ${part.number}`, onPay, part.number)));
    card.append(header, summary, progress, el("h4", "", "Entrada e parcelas"), parts);
    return card;
}

function partItem(payment: ClientPayment, part: ClientPaymentPart, type: PaymentPartReference["partType"], label: string, onPay?: PayHandler, number?: number): HTMLElement {
    const item = el("div", "client-financial-part");
    const dueDate = part.dueDate ?? payment.firstDueDate;
    const status = paymentPartStatus(dueDate, part.isPaid, part.pix);
    const description = document.createElement("span");
    description.append(el("strong", "", dueDate ? `${label} | ${formatDate(dueDate)}` : label), el("small", "", `${money(part.amountCents)} · ${status.timeLabel}`));
    const actions = el("div", "client-financial-part-actions");
    actions.append(el("em", `is-${status.kind}`, status.listLabel));
    if (!part.isPaid && onPay) actions.append(payButton({ paymentId: payment.id, paymentTitle: payment.title, partType: type, installmentNumber: number, label, amountCents: part.amountCents, hasActivePix: status.kind === "analysis" }, onPay));
    item.append(description, actions);
    return item;
}

function payButton(part: PaymentPartReference, onPay: PayHandler): HTMLButtonElement { const button = el("button", "client-financial-pay-button") as HTMLButtonElement; button.type = "button"; button.textContent = part.hasActivePix ? "Ver código Pix" : "Pagar com Pix"; button.addEventListener("click", () => onPay(part)); return button; }
function analysisNotice(): HTMLElement { return el("p", "client-financial-analysis-notice", "Se você já realizou seu pagamento, não se preocupe. Em breve o status da parcela será atualizado."); }
function reference(payment: ClientPayment, part: ClientPaymentPart, type: PaymentPartReference["partType"], label: string, dueDate: string, number?: number): HighlightedPaymentPart { return { paymentId: payment.id, paymentTitle: payment.title, partType: type, installmentNumber: number, label, amountCents: part.amountCents, dueDate, isPaid: part.isPaid, pix: part.pix, hasActivePix: Boolean(part.pix && new Date(part.pix.expiresAt).getTime() > Date.now()) }; }
function paymentPartStatus(value: string | undefined, isPaid: boolean, pix?: ClientPaymentPart["pix"]): { kind: "paid" | "pending" | "overdue" | "analysis"; listLabel: string; timeLabel: string; highlightLabel: string } {
    if (isPaid) return { kind: "paid", listLabel: "Pago", timeLabel: "Pago", highlightLabel: "Pagamento confirmado" };
    if (pix && new Date(pix.expiresAt).getTime() > Date.now()) return { kind: "analysis", listLabel: "Em análise", timeLabel: "Aguardando confirmação", highlightLabel: "Pagamento em análise" };
    if (!value || !isDateOnly(value)) return { kind: "pending", listLabel: "Pendente", timeLabel: "Data não informada", highlightLabel: "Data não informada" };
    const difference = daysBetween(localDateValue(new Date()), dateValue(value));
    if (difference < 0) { const days = Math.abs(difference); return { kind: "overdue", listLabel: "Atrasado", timeLabel: days === 1 ? "Vencida há 1 dia" : `Vencida há ${days} dias`, highlightLabel: days === 1 ? "Atrasado há 1 dia" : `Atrasado há ${days} dias` }; }
    const timeLabel = difference === 0 ? "Vence hoje" : difference === 1 ? "Falta 1 dia" : `Faltam ${difference} dias`;
    return { kind: "pending", listLabel: "Pendente", timeLabel, highlightLabel: timeLabel };
}
function paymentHasActivePix(payment: ClientPayment): boolean { return [payment.downPayment, ...payment.installments].some(part => !part.isPaid && part.pix && new Date(part.pix.expiresAt).getTime() > Date.now()); }
function paymentHasOverduePart(payment: ClientPayment): boolean { const today = localDateValue(new Date()); return [payment.downPayment, ...payment.installments].some(part => part.amountCents > 0 && !part.isPaid && (!part.pix || new Date(part.pix.expiresAt).getTime() <= Date.now()) && part.dueDate && isDateOnly(part.dueDate) && dateValue(part.dueDate) < today); }
function summaryItem(label: string, value: number, highlight = false): HTMLElement { const item = el("span", highlight ? "client-financial-summary-highlight" : ""); item.append(el("small", "", label), el("strong", "", money(value))); return item; }
function detail(label: string, value: string): HTMLElement { const item = document.createElement("span"); item.append(el("small", "", label), el("strong", "", value)); return item; }
function conditionsText(payment: ClientPayment): string { const values = [`${payment.installmentCount} parcela${payment.installmentCount === 1 ? "" : "s"}`]; if (payment.downPaymentPercentage > 0) values.push(`${percentage(payment.downPaymentPercentage)} de entrada`); if (payment.discountPercentage > 0) values.push(`${percentage(payment.discountPercentage)} de desconto`); if (payment.interestPercentage > 0) values.push(`${percentage(payment.interestPercentage)} de juros`); return values.join(" · "); }
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] { const value = document.createElement(tag); if (className) value.className = className; if (text) value.textContent = text; return value; }
function money(value: number): string { return currency.format(value / 100); }
function percentage(value: number): string { return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`; }
function formatDate(value: string): string { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function isDateOnly(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function dateValue(value: string): number { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day); }
function localDateValue(value: Date): number { return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()); }
function daysBetween(from: number, to: number): number { return Math.round((to - from) / 86_400_000); }
