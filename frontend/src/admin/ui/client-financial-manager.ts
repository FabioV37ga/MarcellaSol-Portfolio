import type {
    AdminSession,
    AdminSystemApi,
    ClientPayment,
    PaymentFields
} from "../infrastructure/admin-system.api.js";
import type { ClientFinancialElements } from "../selectors/client-financial.selector.js";

interface PreviewSchedule {
    downPaymentCents: number;
    installments: number[];
    finalAmountCents: number;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export class ClientFinancialManager {
    private payments: ClientPayment[];
    private editing?: ClientPayment;
    private saving = false;
    private readonly title: HTMLInputElement;
    private readonly total: HTMLInputElement;
    private readonly count: HTMLInputElement;
    private readonly down: HTMLInputElement;
    private readonly discount: HTMLInputElement;
    private readonly interest: HTMLInputElement;
    private readonly preview: HTMLElement;
    private readonly previewFinal: HTMLElement;
    private readonly previewRemaining: HTMLElement;
    private readonly partsEditor: HTMLElement;
    private readonly formFeedback: HTMLElement;
    private readonly save: HTMLButtonElement;

    constructor(
        private readonly elements: ClientFinancialElements,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly clientId: string,
        payments: ClientPayment[]
    ) {
        this.payments = payments;
        const root = elements.root;
        this.title = required<HTMLInputElement>(root, "#financial-payment-title");
        this.total = required<HTMLInputElement>(root, "#financial-payment-total");
        this.count = required<HTMLInputElement>(root, "#financial-payment-count");
        this.down = required<HTMLInputElement>(root, "#financial-payment-down");
        this.discount = required<HTMLInputElement>(root, "#financial-payment-discount");
        this.interest = required<HTMLInputElement>(root, "#financial-payment-interest");
        this.preview = required(root, "#financial-payment-preview");
        this.previewFinal = required(root, "#financial-preview-final");
        this.previewRemaining = required(root, "#financial-preview-remaining");
        this.partsEditor = required(root, "#financial-installments-editor");
        this.formFeedback = required(root, "#financial-payment-form-feedback");
        this.save = required<HTMLButtonElement>(root, "#financial-payment-save");
        this.bind();
        this.render();
    }

    private bind(): void {
        this.elements.newPayment.addEventListener("click", () => this.openEditor());
        required<HTMLButtonElement>(this.elements.root, "#financial-payment-cancel")
            .addEventListener("click", () => this.elements.dialog.close());
        [this.total, this.count, this.down, this.discount, this.interest]
            .forEach(input => input.addEventListener("input", () => this.renderPreview()));
        this.partsEditor.addEventListener("change", () => this.renderPreview());
        this.elements.form.addEventListener("submit", event => {
            event.preventDefault();
            void this.submit();
        });
        this.elements.dialog.addEventListener("close", () => {
            this.editing = undefined;
            this.formFeedback.textContent = "";
        });
    }

    private render(): void {
        this.elements.paymentsList.replaceChildren();
        if (this.payments.length === 0) {
            const empty = document.createElement("p");
            empty.className = "financial-empty";
            empty.textContent = "Nenhum pagamento cadastrado.";
            this.elements.paymentsList.append(empty);
            return;
        }

        this.payments.forEach(payment => this.elements.paymentsList.append(this.paymentCard(payment)));
    }

    private paymentCard(payment: ClientPayment): HTMLElement {
        const card = document.createElement("article");
        card.className = "financial-payment-card";

        const header = document.createElement("header");
        const heading = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = payment.title;
        const conditions = document.createElement("p");
        conditions.textContent = this.conditionsText(payment);
        heading.append(title, conditions);
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "financial-payment-edit";
        edit.innerHTML = "<i class='fa fa-pencil' aria-hidden=true></i> Editar";
        edit.addEventListener("click", () => this.openEditor(payment));
        header.append(heading, edit);

        const summary = document.createElement("div");
        summary.className = "financial-payment-card-summary";
        summary.append(
            summaryItem("Valor final", formatCents(payment.finalAmountCents)),
            summaryItem("Pago", formatCents(payment.paidAmountCents)),
            summaryItem("Restante", formatCents(payment.remainingAmountCents), true)
        );

        const progress = document.createElement("div");
        progress.className = "financial-payment-progress";
        const progressBar = document.createElement("span");
        const percentage = payment.finalAmountCents > 0
            ? Math.min(100, payment.paidAmountCents / payment.finalAmountCents * 100) : 0;
        progressBar.style.width = `${percentage}%`;
        progress.append(progressBar);
        progress.setAttribute("aria-label", `${Math.round(percentage)}% pago`);

        const parts = document.createElement("div");
        parts.className = "financial-parts-list";
        parts.append(this.partRow(
            payment,
            "Entrada",
            payment.downPayment.amountCents,
            payment.downPayment.isPaid,
            undefined,
            payment.downPayment.amountCents === 0
        ));
        payment.installments.forEach(item => parts.append(
            this.partRow(payment, `Parcela ${item.number}`, item.amountCents, item.isPaid, item.number)
        ));
        card.append(header, summary, progress, parts);
        return card;
    }

    private partRow(
        payment: ClientPayment,
        label: string,
        amountCents: number,
        isPaid: boolean,
        installmentNumber?: number,
        disabled = false
    ): HTMLElement {
        const row = document.createElement("div");
        row.className = "financial-part-row";
        const description = document.createElement("span");
        description.className = "financial-part-description";
        const name = document.createElement("strong");
        name.textContent = label;
        const amount = document.createElement("small");
        amount.textContent = disabled ? "Sem entrada" : formatCents(amountCents);
        description.append(name, amount);
        const control = switchControl(label, isPaid, disabled);
        const input = control.querySelector<HTMLInputElement>("input")!;
        input.addEventListener("change", () => void this.togglePart(payment, input, installmentNumber));
        row.append(description, control);
        return row;
    }

    private async togglePart(
        payment: ClientPayment,
        input: HTMLInputElement,
        installmentNumber?: number
    ): Promise<void> {
        input.disabled = true;
        this.elements.feedback.textContent = "Atualizando pagamento...";
        try {
            const updated = installmentNumber === undefined
                ? await this.api.setDownPaymentPaid(this.session, this.clientId, payment.id, input.checked)
                : await this.api.setInstallmentPaid(
                    this.session,
                    this.clientId,
                    payment.id,
                    installmentNumber,
                    input.checked
                );
            this.replacePayment(updated);
            this.elements.feedback.textContent = "Pagamento atualizado.";
        } catch (error) {
            input.checked = !input.checked;
            input.disabled = false;
            this.elements.feedback.textContent = errorMessage(error, "Não foi possível atualizar o pagamento.");
        }
    }

    private openEditor(payment?: ClientPayment): void {
        this.editing = payment;
        this.elements.form.reset();
        required(this.elements.root, "#financial-payment-dialog-title").textContent = payment
            ? "Editar pagamento" : "Gerar pagamento";
        this.title.value = payment?.title ?? "";
        this.total.value = payment ? centsInput(payment.totalAmountCents) : "";
        this.count.value = payment?.installmentCount.toString() ?? "";
        this.down.value = optionalPercentage(payment?.downPaymentPercentage);
        this.discount.value = optionalPercentage(payment?.discountPercentage);
        this.interest.value = optionalPercentage(payment?.interestPercentage);
        this.formFeedback.textContent = "";
        this.partsEditor.replaceChildren();
        this.renderPreview();
        this.elements.dialog.showModal();
    }

    private renderPreview(): void {
        const schedule = previewSchedule(this.total.value, this.count.value, this.down.value, this.discount.value, this.interest.value);
        if (!schedule) {
            this.preview.hidden = true;
            this.partsEditor.replaceChildren();
            return;
        }
        const checked = this.editorPaidState();
        this.partsEditor.replaceChildren();
        this.partsEditor.append(editorPartRow(
            "Entrada",
            schedule.downPaymentCents,
            checked.down,
            "down",
            schedule.downPaymentCents === 0
        ));
        schedule.installments.forEach((amount, index) => this.partsEditor.append(
            editorPartRow(`Parcela ${index + 1}`, amount, checked.installments.has(index + 1), String(index + 1))
        ));
        const paid = (checked.down && schedule.downPaymentCents > 0 ? schedule.downPaymentCents : 0)
            + schedule.installments.reduce((sum, amount, index) => sum + (checked.installments.has(index + 1) ? amount : 0), 0);
        this.previewFinal.textContent = formatCents(schedule.finalAmountCents);
        this.previewRemaining.textContent = formatCents(Math.max(0, schedule.finalAmountCents - paid));
        this.preview.hidden = false;
    }

    private editorPaidState(): { down: boolean; installments: Set<number> } {
        const current = Array.from(this.partsEditor.querySelectorAll<HTMLInputElement>("input[data-part]"));
        if (current.length > 0) {
            return {
                down: current.some(input => input.dataset.part === "down" && input.checked),
                installments: new Set(current
                    .filter(input => input.dataset.part !== "down" && input.checked)
                    .map(input => Number(input.dataset.part)))
            };
        }
        return {
            down: this.editing?.downPayment.isPaid ?? false,
            installments: new Set(this.editing?.installments.filter(item => item.isPaid).map(item => item.number) ?? [])
        };
    }

    private async submit(): Promise<void> {
        if (this.saving || !this.elements.form.reportValidity()) return;
        const paidState = this.editorPaidState();
        const fields: PaymentFields = {
            title: this.title.value,
            totalAmount: this.total.value,
            installmentCount: Number(this.count.value),
            downPaymentPercentage: this.down.value,
            discountPercentage: this.discount.value,
            interestPercentage: this.interest.value,
            downPaymentIsPaid: paidState.down,
            paidInstallmentNumbers: [...paidState.installments]
        };
        this.saving = true;
        this.save.disabled = true;
        this.formFeedback.textContent = "Salvando pagamento...";
        try {
            const saved = this.editing
                ? await this.api.editPayment(this.session, this.clientId, this.editing.id, fields)
                : await this.api.createPayment(this.session, this.clientId, fields);
            this.replacePayment(saved);
            this.elements.dialog.close();
            this.elements.feedback.textContent = "Pagamento salvo com sucesso.";
        } catch (error) {
            this.formFeedback.textContent = errorMessage(error, "Não foi possível salvar o pagamento.");
        } finally {
            this.saving = false;
            this.save.disabled = false;
        }
    }

    private replacePayment(payment: ClientPayment): void {
        const index = this.payments.findIndex(item => item.id === payment.id);
        if (index >= 0) this.payments[index] = payment;
        else this.payments.unshift(payment);
        this.render();
    }

    private conditionsText(payment: ClientPayment): string {
        const conditions = [`${payment.installmentCount}x`];
        if (payment.downPaymentPercentage > 0) conditions.push(`${formatPercentage(payment.downPaymentPercentage)} de entrada`);
        if (payment.discountPercentage > 0) conditions.push(`${formatPercentage(payment.discountPercentage)} de desconto`);
        if (payment.interestPercentage > 0) conditions.push(`${formatPercentage(payment.interestPercentage)} de juros`);
        return conditions.join(" · ");
    }
}

function required<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`A view client-financial está desatualizada: ${selector} não foi encontrado.`);
    return element;
}

function switchControl(label: string, checked: boolean, disabled = false): HTMLLabelElement {
    const control = document.createElement("label");
    control.className = "financial-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.disabled = disabled;
    input.setAttribute("aria-label", `${label} pago`);
    const track = document.createElement("span");
    track.setAttribute("aria-hidden", "true");
    const state = document.createElement("em");
    state.textContent = checked ? "Pago" : "Não pago";
    input.addEventListener("change", () => { state.textContent = input.checked ? "Pago" : "Não pago"; });
    control.append(input, track, state);
    return control;
}

function editorPartRow(label: string, amount: number, checked: boolean, part: string, disabled = false): HTMLElement {
    const row = document.createElement("div");
    row.className = "financial-part-row";
    const description = document.createElement("span");
    description.className = "financial-part-description";
    const name = document.createElement("strong");
    name.textContent = label;
    const value = document.createElement("small");
    value.textContent = disabled ? "Sem entrada" : formatCents(amount);
    description.append(name, value);
    const control = switchControl(label, checked, disabled);
    const input = control.querySelector("input")!;
    input.dataset.part = part;
    row.append(description, control);
    return row;
}

function summaryItem(label: string, value: string, highlight = false): HTMLElement {
    const item = document.createElement("span");
    if (highlight) item.className = "financial-summary-highlight";
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    item.append(small, strong);
    return item;
}

function previewSchedule(total: string, count: string, down: string, discount: string, interest: string): PreviewSchedule | undefined {
    const totalCents = Math.round(Number(total) * 100);
    const installments = Number(count);
    if (!Number.isSafeInteger(totalCents) || totalCents < 1 || !Number.isInteger(installments) || installments < 1 || installments > 120) return undefined;
    const downRate = validPercentage(down);
    const discountRate = validPercentage(discount);
    const interestRate = validPercentage(interest);
    if (downRate === undefined || discountRate === undefined || interestRate === undefined) return undefined;
    const discounted = totalCents - Math.round(totalCents * discountRate / 100);
    const downPaymentCents = Math.round(discounted * downRate / 100);
    const financed = discounted - downPaymentCents;
    const installmentTotal = financed + Math.round(financed * interestRate / 100);
    const base = Math.floor(installmentTotal / installments);
    const remainder = installmentTotal % installments;
    return {
        downPaymentCents,
        installments: Array.from({ length: installments }, (_, index) => base + (index < remainder ? 1 : 0)),
        finalAmountCents: downPaymentCents + installmentTotal
    };
}

function validPercentage(value: string): number | undefined {
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : undefined;
}

function formatCents(value: number): string { return currency.format(value / 100); }
function centsInput(value: number): string { return (value / 100).toFixed(2); }
function optionalPercentage(value: number | undefined): string { return value ? value.toString() : ""; }
function formatPercentage(value: number): string { return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`; }
function errorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
