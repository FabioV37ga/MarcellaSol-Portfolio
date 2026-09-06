import type { ClientPayment, ClientPaymentPart } from "../infrastructure/client-system.api.js";
import {
    paymentHasActivePix,
    paymentHasOverduePart,
    paymentPartStatus,
    selectHighlightedPaymentPart,
    systemFinancialClock,
    type FinancialClock
} from "@/shared/financial/payment-presentation.js";

export { selectHighlightedPaymentPart } from "@/shared/financial/payment-presentation.js";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export interface PaymentPartReference { paymentId: string; paymentTitle: string; partType: "down-payment" | "installment"; installmentNumber?: number; label: string; amountCents: number; hasActivePix?: boolean; }
type PayHandler = (part: PaymentPartReference) => void;

export function clientPaymentHighlight(
    payments: ClientPayment[],
    onPay?: PayHandler,
    clock: FinancialClock = systemFinancialClock
): HTMLElement {
    const highlighted = selectHighlightedPaymentPart(payments, clock);
    if (!highlighted) return el("p", "client-financial-highlight-empty", "Nenhum vencimento programado no momento.");
    const content = el("article", "client-financial-highlight-payment");
    const main = el("div", "client-financial-highlight-main");
    const status = paymentPartStatus(highlighted.dueDate, highlighted.isPaid, highlighted.pix, clock);
    main.append(el("span", "", highlighted.paymentTitle), el("h3", "", highlighted.label), el("strong", `client-financial-highlight-countdown is-${status.kind}`, status.highlightLabel));
    if (!highlighted.isPaid && onPay) main.append(payButton(highlighted, onPay));
    if (status.kind === "analysis") main.append(analysisNotice());
    const details = el("div", "client-financial-highlight-details");
    details.append(detail("Data", formatDate(highlighted.dueDate)), detail("Valor", money(highlighted.amountCents)));
    content.append(main, details);
    return content;
}

export function clientPaymentItem(
    payment: ClientPayment,
    onPay?: PayHandler,
    clock: FinancialClock = systemFinancialClock
): HTMLElement {
    const card = el("article", "client-financial-payment");
    const header = document.createElement("header");
    const heading = document.createElement("div");
    heading.append(el("h3", "", payment.title), el("p", "", conditionsText(payment)));
    const settled = payment.remainingAmountCents === 0;
    const overdue = !settled && paymentHasOverduePart(payment, clock);
    const analysis = !settled && !overdue && paymentHasActivePix(payment, clock);
    header.append(heading, el("span", `client-financial-payment-status ${settled ? "is-settled" : overdue ? "is-overdue" : analysis ? "is-analysis" : "is-pending"}`, settled ? "Quitado" : overdue ? "Com atraso" : analysis ? "Em análise" : "Em aberto"));
    const summary = el("div", "client-financial-summary");
    summary.append(summaryItem("Valor final", payment.finalAmountCents), summaryItem("Valor pago", payment.paidAmountCents), summaryItem("Saldo restante", payment.remainingAmountCents, true));
    const progress = el("div", "client-financial-progress");
    const percentage = payment.finalAmountCents > 0 ? Math.min(100, payment.paidAmountCents / payment.finalAmountCents * 100) : 0;
    const bar = document.createElement("span"); bar.style.width = `${percentage}%`; progress.append(bar); progress.setAttribute("aria-label", `${Math.round(percentage)}% pago`);
    const parts = el("div", "client-financial-parts");
    if (payment.downPayment.amountCents > 0) parts.append(partItem(payment, payment.downPayment, "down-payment", "Entrada", onPay, clock));
    payment.installments.forEach(part => parts.append(partItem(payment, part, "installment", `Parcela ${part.number}`, onPay, clock, part.number)));
    card.append(header, summary, progress, el("h4", "", "Entrada e parcelas"), parts);
    return card;
}

function partItem(payment: ClientPayment, part: ClientPaymentPart, type: PaymentPartReference["partType"], label: string, onPay: PayHandler | undefined, clock: FinancialClock, number?: number): HTMLElement {
    const item = el("div", "client-financial-part");
    const dueDate = part.dueDate ?? payment.firstDueDate;
    const status = paymentPartStatus(dueDate, part.isPaid, part.pix, clock);
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
function summaryItem(label: string, value: number, highlight = false): HTMLElement { const item = el("span", highlight ? "client-financial-summary-highlight" : ""); item.append(el("small", "", label), el("strong", "", money(value))); return item; }
function detail(label: string, value: string): HTMLElement { const item = document.createElement("span"); item.append(el("small", "", label), el("strong", "", value)); return item; }
function conditionsText(payment: ClientPayment): string { const values = [`${payment.installmentCount} parcela${payment.installmentCount === 1 ? "" : "s"}`]; if (payment.downPaymentPercentage > 0) values.push(`${percentage(payment.downPaymentPercentage)} de entrada`); if (payment.discountPercentage > 0) values.push(`${percentage(payment.discountPercentage)} de desconto`); if (payment.interestPercentage > 0) values.push(`${percentage(payment.interestPercentage)} de juros`); return values.join(" · "); }
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] { const value = document.createElement(tag); if (className) value.className = className; if (text) value.textContent = text; return value; }
function money(value: number): string { return currency.format(value / 100); }
function percentage(value: number): string { return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`; }
function formatDate(value: string): string { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
