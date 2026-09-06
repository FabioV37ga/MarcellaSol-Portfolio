import type {
    AdminSession,
    AdminSystemApi,
    ClientPayment,
    PaymentFields,
    PaymentPreview,
    PaymentPreviewFields
} from "../infrastructure/admin-system.api.js";
import type { ClientFinancialElements } from "../selectors/client-financial.selector.js";
import { dueDateLabel, isOverdue } from "@/shared/financial/payment-presentation.js";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export class ClientFinancialManager {
    private payments: ClientPayment[];
    private editing?: ClientPayment;
    private deletingPayment?: ClientPayment;
    private saving = false;
    private deleting = false;
    private deleteCountdownTimer?: number;
    private previewTimer?: number;
    private previewRequest?: AbortController;
    private previewSchedule?: PaymentPreview;
    private readonly title: HTMLInputElement;
    private readonly total: HTMLInputElement;
    private readonly count: HTMLInputElement;
    private readonly firstDueDate: HTMLInputElement;
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
        this.firstDueDate = required<HTMLInputElement>(root, "#financial-payment-first-due-date");
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
        [this.total, this.count, this.firstDueDate, this.down, this.discount, this.interest]
            .forEach(input => input.addEventListener("input", () => this.schedulePreview()));
        this.partsEditor.addEventListener("change", () => this.renderPreviewValues());
        this.elements.form.addEventListener("submit", event => {
            event.preventDefault();
            void this.submit();
        });
        this.elements.dialog.addEventListener("close", () => {
            window.clearTimeout(this.previewTimer);
            this.previewRequest?.abort();
            this.previewSchedule = undefined;
            this.preview.removeAttribute("aria-busy");
            this.editing = undefined;
            this.formFeedback.textContent = "";
        });
        this.elements.deleteCancel.addEventListener("click", () => this.elements.deleteDialog.close());
        this.elements.deleteConfirm.addEventListener("click", () => { void this.removePayment(); });
        this.elements.deleteDialog.addEventListener("cancel", event => {
            if (this.deleting) event.preventDefault();
        });
        this.elements.deleteDialog.addEventListener("close", () => {
            this.clearDeleteCountdown();
            this.deletingPayment = undefined;
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
        const actions = document.createElement("div");
        actions.className = "financial-payment-card-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "financial-payment-edit";
        edit.innerHTML = "<i class='fa fa-pencil' aria-hidden=true></i> Editar";
        edit.addEventListener("click", () => this.openEditor(payment));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "financial-payment-delete";
        remove.innerHTML = "<i class='fa fa-trash' aria-hidden=true></i> Remover";
        remove.addEventListener("click", () => this.openDeleteDialog(payment));
        actions.append(edit, remove);
        header.append(heading, actions);

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
            payment.downPayment.amountCents === 0,
            payment.downPayment.dueDate ?? payment.firstDueDate
        ));
        payment.installments.forEach(item => parts.append(
            this.partRow(payment, `Parcela ${item.number}`, item.amountCents, item.isPaid, item.number, false, item.dueDate)
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
        disabled = false,
        dueDate?: string
    ): HTMLElement {
        const row = document.createElement("div");
        row.className = "financial-part-row";
        const description = document.createElement("span");
        description.className = "financial-part-description";
        const name = document.createElement("strong");
        name.textContent = dueDate ? `${label} | ${formatDate(dueDate)}` : label;
        const amount = document.createElement("small");
        amount.textContent = disabled
            ? "Sem entrada"
            : `${formatCents(amountCents)} · ${dueDateLabel(dueDate, isPaid)}`;
        description.append(name, amount);
        const control = switchControl(label, isPaid, disabled, dueDate);
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
                ? await this.api.setDownPaymentPaid(this.session, this.clientId, payment.id, input.checked, payment.version)
                : await this.api.setInstallmentPaid(
                    this.session,
                    this.clientId,
                    payment.id,
                    installmentNumber,
                    input.checked,
                    payment.version
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
        const termsLocked = payment?.financialTermsLocked ?? false;
        this.elements.form.reset();
        required(this.elements.root, "#financial-payment-dialog-title").textContent = payment
            ? "Editar pagamento" : "Gerar pagamento";
        this.title.value = payment?.title ?? "";
        this.total.value = payment ? centsInput(payment.totalAmountCents) : "";
        this.count.value = payment?.installmentCount.toString() ?? "";
        this.firstDueDate.value = payment?.firstDueDate ?? payment?.installments[0]?.dueDate ?? todayDateOnly();
        this.down.value = optionalPercentage(payment?.downPaymentPercentage);
        this.discount.value = optionalPercentage(payment?.discountPercentage);
        this.interest.value = optionalPercentage(payment?.interestPercentage);
        [this.total, this.count, this.firstDueDate, this.down, this.discount, this.interest]
            .forEach(input => { input.disabled = termsLocked; });
        this.formFeedback.textContent = termsLocked
            ? "As condições financeiras estão bloqueadas porque já existe um recebimento confirmado."
            : "";
        this.partsEditor.replaceChildren();
        void this.requestPreview();
        this.elements.dialog.showModal();
    }

    private openDeleteDialog(payment: ClientPayment): void {
        this.clearDeleteCountdown();
        this.deletingPayment = payment;
        this.elements.deleteTitle.textContent = `Remover “${payment.title}”?`;
        this.elements.deleteDescription.textContent = payment.financialTermsLocked
            ? "Esta cobrança possui ou já possuiu recebimentos confirmados. A remoção a ocultará do administrador e do cliente, mas manterá o registro para auditoria."
            : "A cobrança será ocultada do administrador e do cliente. O registro será mantido para auditoria.";
        this.elements.deleteWarning.hidden = !payment.financialTermsLocked;
        this.elements.deleteCountdown.hidden = !payment.financialTermsLocked;
        this.elements.deleteCountdown.textContent = "";
        this.elements.deleteCancel.disabled = false;
        this.elements.deleteConfirm.disabled = payment.financialTermsLocked;
        this.elements.deleteConfirm.textContent = payment.financialTermsLocked
            ? "Remover em 5s"
            : "Remover pagamento";

        if (payment.financialTermsLocked) {
            let seconds = 5;
            this.elements.deleteCountdown.textContent = confirmationCountdownText(seconds);
            this.deleteCountdownTimer = window.setInterval(() => {
                seconds -= 1;
                if (seconds > 0) {
                    this.elements.deleteCountdown.textContent = confirmationCountdownText(seconds);
                    this.elements.deleteConfirm.textContent = `Remover em ${seconds}s`;
                    return;
                }
                this.clearDeleteCountdown();
                this.elements.deleteCountdown.textContent = "Revise o alerta acima antes de confirmar.";
                this.elements.deleteConfirm.textContent = "Remover mesmo assim";
                this.elements.deleteConfirm.disabled = false;
            }, 1000);
        }

        this.elements.deleteDialog.showModal();
    }

    private async removePayment(): Promise<void> {
        const payment = this.deletingPayment;
        if (!payment || this.deleting || this.elements.deleteConfirm.disabled) return;
        this.deleting = true;
        this.elements.deleteCancel.disabled = true;
        this.elements.deleteConfirm.disabled = true;
        this.elements.deleteConfirm.textContent = "Removendo...";
        try {
            await this.api.removePayment(
                this.session,
                this.clientId,
                payment.id,
                payment.version,
                payment.financialTermsLocked
            );
            this.payments = this.payments.filter(item => item.id !== payment.id);
            this.elements.deleteDialog.close();
            this.render();
            this.elements.feedback.textContent = "Pagamento removido com sucesso.";
        } catch (error) {
            this.elements.deleteConfirm.disabled = false;
            this.elements.deleteConfirm.textContent = payment.financialTermsLocked
                ? "Remover mesmo assim"
                : "Remover pagamento";
            this.elements.deleteCancel.disabled = false;
            const message = errorMessage(error, "Não foi possível remover o pagamento.");
            this.elements.deleteCountdown.hidden = false;
            this.elements.deleteCountdown.textContent = message;
            this.elements.feedback.textContent = message;
        } finally {
            this.deleting = false;
        }
    }

    private clearDeleteCountdown(): void {
        window.clearInterval(this.deleteCountdownTimer);
        this.deleteCountdownTimer = undefined;
    }

    dispose(): void {
        this.clearDeleteCountdown();
        window.clearTimeout(this.previewTimer);
        this.previewRequest?.abort();
        if (this.elements.dialog.open) this.elements.dialog.close();
        if (this.elements.deleteDialog.open) this.elements.deleteDialog.close();
    }

    private schedulePreview(): void {
        window.clearTimeout(this.previewTimer);
        this.previewRequest?.abort();
        this.previewSchedule = undefined;
        this.preview.setAttribute("aria-busy", "true");
        this.previewTimer = window.setTimeout(() => void this.requestPreview(), 250);
    }

    private async requestPreview(): Promise<void> {
        window.clearTimeout(this.previewTimer);
        this.previewTimer = undefined;
        if (!this.previewInputsAreValid()) {
            this.previewSchedule = undefined;
            this.preview.hidden = true;
            this.partsEditor.replaceChildren();
            this.preview.removeAttribute("aria-busy");
            return;
        }
        const paidState = this.editorPaidState();
        this.previewRequest?.abort();
        const request = new AbortController();
        this.previewRequest = request;
        try {
            const schedule = await this.api.previewPayment(this.session, this.previewFields(), request.signal);
            if (request.signal.aborted) return;
            this.previewSchedule = schedule;
            this.renderPreviewSchedule(schedule, paidState);
            this.preview.removeAttribute("aria-busy");
            if (!this.editing?.financialTermsLocked) this.formFeedback.textContent = "";
        } catch (error) {
            if (request.signal.aborted) return;
            this.previewSchedule = undefined;
            this.preview.hidden = true;
            this.partsEditor.replaceChildren();
            this.preview.removeAttribute("aria-busy");
            this.formFeedback.textContent = errorMessage(error, "Não foi possível calcular a prévia do pagamento.");
        } finally {
            if (this.previewRequest === request) this.previewRequest = undefined;
        }
    }

    private renderPreviewSchedule(
        schedule: PaymentPreview,
        checked: { down: boolean; installments: Set<number> }
    ): void {
        this.partsEditor.replaceChildren();
        this.partsEditor.append(editorPartRow(
            "Entrada",
            schedule.downPaymentCents,
            checked.down,
            "down",
            schedule.downPaymentCents === 0,
            schedule.firstDueDate,
            Boolean(this.editing)
        ));
        schedule.installments.forEach((installment, index) => this.partsEditor.append(
            editorPartRow(
                `Parcela ${index + 1}`,
                installment.amountCents,
                checked.installments.has(index + 1),
                String(index + 1),
                false,
                installment.dueDate,
                Boolean(this.editing)
            )
        ));
        this.previewFinal.textContent = formatCents(schedule.finalAmountCents);
        this.updatePreviewRemaining(schedule, checked);
        this.preview.hidden = false;
    }

    private renderPreviewValues(): void {
        if (!this.previewSchedule) return;
        this.updatePreviewRemaining(this.previewSchedule, this.editorPaidState());
    }

    private updatePreviewRemaining(
        schedule: PaymentPreview,
        checked: { down: boolean; installments: Set<number> }
    ): void {
        const paid = (checked.down && schedule.downPaymentCents > 0 ? schedule.downPaymentCents : 0)
            + schedule.installments.reduce((sum, installment, index) => (
                sum + (checked.installments.has(index + 1) ? installment.amountCents : 0)
            ), 0);
        this.previewRemaining.textContent = formatCents(Math.max(0, schedule.finalAmountCents - paid));
    }

    private previewFields(): PaymentPreviewFields {
        return {
            totalAmount: this.total.value,
            installmentCount: Number(this.count.value),
            firstDueDate: this.firstDueDate.value,
            downPaymentPercentage: this.down.value,
            discountPercentage: this.discount.value,
            interestPercentage: this.interest.value
        };
    }

    private previewInputsAreValid(): boolean {
        return Boolean(this.total.value && this.count.value && this.firstDueDate.value)
            && [this.total, this.count, this.firstDueDate, this.down, this.discount, this.interest]
                .every(input => input.checkValidity());
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
            firstDueDate: this.firstDueDate.value,
            downPaymentPercentage: this.down.value,
            discountPercentage: this.discount.value,
            interestPercentage: this.interest.value,
            ...(!this.editing ? {
                downPaymentIsPaid: paidState.down,
                paidInstallmentNumbers: [...paidState.installments]
            } : {})
        };
        if (this.editing) fields.version = this.editing.version;
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

function switchControl(label: string, checked: boolean, disabled = false, dueDate?: string): HTMLLabelElement {
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
    state.textContent = paymentStateLabel(checked, dueDate);
    state.classList.toggle("is-overdue", !checked && isOverdue(dueDate));
    input.addEventListener("change", () => {
        state.textContent = paymentStateLabel(input.checked, dueDate);
        state.classList.toggle("is-overdue", !input.checked && isOverdue(dueDate));
    });
    control.append(input, track, state);
    return control;
}

function editorPartRow(
    label: string,
    amount: number,
    checked: boolean,
    part: string,
    disabled = false,
    dueDate?: string,
    statusDisabled = false
): HTMLElement {
    const row = document.createElement("div");
    row.className = "financial-part-row";
    const description = document.createElement("span");
    description.className = "financial-part-description";
    const name = document.createElement("strong");
    name.textContent = dueDate ? `${label} | ${formatDate(dueDate)}` : label;
    const value = document.createElement("small");
    value.textContent = disabled ? "Sem entrada" : `${formatCents(amount)} · ${dueDateLabel(dueDate, checked)}`;
    description.append(name, value);
    const control = switchControl(label, checked, disabled || statusDisabled, dueDate);
    const input = control.querySelector<HTMLInputElement>("input")!;
    input.dataset.part = part;
    input.addEventListener("change", () => {
        value.textContent = disabled ? "Sem entrada" : `${formatCents(amount)} · ${dueDateLabel(dueDate, input.checked)}`;
    });
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

function formatCents(value: number): string { return currency.format(value / 100); }
function centsInput(value: number): string { return (value / 100).toFixed(2); }
function optionalPercentage(value: number | undefined): string { return value ? value.toString() : ""; }
function formatPercentage(value: number): string { return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`; }
function confirmationCountdownText(seconds: number): string {
    return `A confirmação será liberada em ${seconds} segundo${seconds === 1 ? "" : "s"}.`;
}
function errorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function todayDateOnly(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}
function formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}
function paymentStateLabel(isPaid: boolean, dueDate?: string): string {
    return isPaid ? "Pago" : isOverdue(dueDate) ? "Atrasado" : "Não pago";
}
