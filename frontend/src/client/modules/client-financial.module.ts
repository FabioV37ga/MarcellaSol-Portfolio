import u from "umbrellajs";
import type { ClientRoute } from "../navigation/client-system.router.js";
import type { baseElements } from "../selectors/base.selector.js";
import { getClientFinancialElements } from "../selectors/financial.selector.js";
import type { system } from "../templates/interface.js";
import { clientPaymentHighlight, clientPaymentItem, type PaymentPartReference } from "../templates/client-payment-item.template.js";
import { ClientSystemApi, type ClientPayment } from "../infrastructure/client-system.api.js";
import type { FinancialHighlightContract } from "@/shared/financial/payment-contract.js";
import { ClientSystemView } from "../views/clientSystem.view.js";

export class ClientFinancialModule {
    private requestId = 0;
    private analysisWindowTimer?: number;
    private pixCountdownTimer?: number;
    private pixCopyFeedbackTimer?: number;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly api: ClientSystemApi,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) { }

    dispose(): void {
        this.requestId += 1;
        window.clearTimeout(this.analysisWindowTimer);
        window.clearInterval(this.pixCountdownTimer);
        window.clearTimeout(this.pixCopyFeedbackTimer);
        this.analysisWindowTimer = undefined;
        this.pixCountdownTimer = undefined;
        this.pixCopyFeedbackTimer = undefined;
    }

    async mount(baseElements?: baseElements): Promise<void> {
        const model = this.models.financial;
        if (!model) {
            console.error('A view "financial" não foi encontrada para o cliente.');
            return;
        }

        this.view.render(model, ".page-content");
        this.view.styleNavButton(baseElements?.desktop_nav_financial);
        const elements = getClientFinancialElements();
        const requestId = ++this.requestId;
        window.clearTimeout(this.analysisWindowTimer);
        window.clearInterval(this.pixCountdownTimer);
        window.clearTimeout(this.pixCopyFeedbackTimer);
        this.view.registerDisposer(() => this.dispose());
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        let payments: ClientPayment[] = [];
        let nextCursor: string | undefined;
        let totalPaymentCount = 0;
        let loadingMore = false;
        let highlight: FinancialHighlightContract | undefined;
        const scheduleAnalysisWindowRefresh = (): void => {
            window.clearTimeout(this.analysisWindowTimer);
            const analysisWindowEnds = payments.reduce<Array<ClientPayment["downPayment"]>>((parts, payment) => {
                parts.push(payment.downPayment, ...payment.installments);
                return parts;
            }, [])
                .map(part => part.pix ? new Date(part.pix.analysisWindowEndsAt).getTime() : 0)
                .filter(value => value > Date.now());
            if (!analysisWindowEnds.length) return;
            this.analysisWindowTimer = window.setTimeout(
                () => renderPayments(),
                Math.min(...analysisWindowEnds) - Date.now() + 100
            );
        };
        const renderPayments = (): void => {
            const openPix = (part: PaymentPartReference): void => { void showPix(part); };
            elements.highlight.replaceChildren(clientPaymentHighlight(highlight, openPix));
            elements.list.replaceChildren();
            elements.empty.hidden = payments.length > 0;
            elements.paginationStatus.textContent = `${payments.length} de ${totalPaymentCount} pagamentos exibidos`;
            elements.loadMore.hidden = !nextCursor;
            elements.loadMore.disabled = loadingMore;
            elements.loadMore.textContent = loadingMore ? "Carregando..." : "Carregar mais";
            if (!payments.length) return;
            const items = document.createDocumentFragment();
            payments.forEach(payment => items.append(clientPaymentItem(payment, openPix)));
            elements.list.append(items);
            scheduleAnalysisWindowRefresh();
        };
        const updateAnalysisWindow = (analysisWindowEndsAt: string): void => {
            const remaining = new Date(analysisWindowEndsAt).getTime() - Date.now();
            if (remaining <= 0) {
                elements.pixAnalysisWindow.textContent = "A janela de análise terminou. O código Pix não foi cancelado; feche esta janela e gere uma nova apresentação para continuar o acompanhamento.";
                elements.pixQr.hidden = true;
                elements.pixCode.hidden = true;
                elements.pixCopy.hidden = true;
                return;
            }
            const hours = Math.floor(remaining / 3_600_000);
            const minutes = Math.floor(remaining % 3_600_000 / 60_000);
            const seconds = Math.floor(remaining % 60_000 / 1000);
            elements.pixAnalysisWindow.textContent = `Janela de análise disponível por ${hours}h ${minutes}min ${seconds}s.`;
        };
        const showPix = async (part: PaymentPartReference): Promise<void> => {
            elements.pixDescription.textContent = `${part.paymentTitle} · ${part.label} · ${(part.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
            elements.pixLoading.hidden = false;
            elements.pixResult.hidden = true;
            elements.pixFeedback.textContent = "";
            elements.pixQr.hidden = false;
            elements.pixCode.hidden = false;
            elements.pixCopy.hidden = false;
            if (!elements.pixDialog.open) elements.pixDialog.showModal();
            try {
                const result = await this.api.generatePaymentPix(this.token, part.paymentId, part.partType, part.installmentNumber);
                if (requestId !== this.requestId || !elements.pixDialog.open) return;
                const index = payments.findIndex(payment => payment.id === result.payment.id);
                if (index >= 0) payments[index] = result.payment;
                if (highlight?.paymentId === result.payment.id
                    && highlight.partType === part.partType
                    && highlight.installmentNumber === part.installmentNumber) {
                    highlight = {
                        ...highlight, pix: {
                            generatedAt: result.pix.generatedAt,
                            analysisWindowEndsAt: result.pix.analysisWindowEndsAt
                        }, hasActivePix: true
                    };
                }
                elements.pixQr.src = result.pix.qrCodeDataUrl;
                elements.pixCode.value = result.pix.brCode;
                elements.pixLoading.hidden = true;
                elements.pixResult.hidden = false;
                renderPayments();
                window.clearInterval(this.pixCountdownTimer);
                updateAnalysisWindow(result.pix.analysisWindowEndsAt);
                this.pixCountdownTimer = window.setInterval(
                    () => updateAnalysisWindow(result.pix.analysisWindowEndsAt),
                    1000
                );
            } catch (error) {
                elements.pixLoading.hidden = true;
                elements.pixFeedback.textContent = error instanceof Error ? error.message : "Não foi possível gerar o código Pix.";
            }
        };
        const closePix = (): void => {
            window.clearInterval(this.pixCountdownTimer);
            elements.pixDialog.close();
        };
        elements.pixClose.addEventListener("click", closePix);
        elements.pixDialog.addEventListener("cancel", event => { event.preventDefault(); closePix(); });
        elements.pixCopy.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(elements.pixCode.value);
                elements.pixCopy.textContent = "Código copiado";
                window.clearTimeout(this.pixCopyFeedbackTimer);
                this.pixCopyFeedbackTimer = window.setTimeout(() => {
                    elements.pixCopy.textContent = "Copiar código Pix";
                    this.pixCopyFeedbackTimer = undefined;
                }, 2000);
            } catch {
                elements.pixCode.focus();
                elements.pixCode.select();
                elements.pixFeedback.textContent = "Selecione e copie o código manualmente.";
            }
        });
        elements.loadMore.addEventListener("click", async () => {
            if (!nextCursor || loadingMore) return;
            loadingMore = true;
            renderPayments();
            try {
                const page = await this.api.loadPayments(this.token, nextCursor);
                if (requestId !== this.requestId) return;
                const known = new Set(payments.map(payment => payment.id));
                payments.push(...page.payments.filter(payment => !known.has(payment.id)));
                nextCursor = page.page.nextCursor;
                totalPaymentCount = page.summary.paymentCount;
                highlight = page.highlight;
                renderPayments();
            } catch (error) {
                elements.feedback.textContent = error instanceof Error ? error.message : "Não foi possível carregar mais pagamentos.";
            } finally {
                loadingMore = false;
                if (requestId === this.requestId) renderPayments();
            }
        });

        try {
            const page = await this.api.loadPayments(this.token);
            if (requestId !== this.requestId) return;
            payments = page.payments;
            nextCursor = page.page.nextCursor;
            totalPaymentCount = page.summary.paymentCount;
            highlight = page.highlight;
            elements.loading.hidden = true;
            renderPayments();
        } catch (error) {
            if (requestId !== this.requestId) return;
            elements.loading.hidden = true;
            elements.highlight.textContent = "Não foi possível identificar o pagamento em destaque.";
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar os pagamentos.";
        }
    }
}
