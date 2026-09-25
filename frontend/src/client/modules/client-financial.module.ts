import type { ClientRoute } from "../navigation/client-system.router.js";
import type { baseElements } from "../selectors/base.selector.js";
import { getClientFinancialElements } from "../selectors/financial.selector.js";
import type { system } from "../templates/interface.js";
import { clientPaymentHighlight, clientPaymentItem, type PaymentPartReference } from "../templates/client-payment-item.template.js";
import type { ClientPayment, ClientPaymentPage, ClientPaymentsGateway } from "../infrastructure/payments.api.js";
import type { FinancialHighlightContract, PaymentSummaryContract } from "@/shared/financial/payment-contract.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { reconcileCollection } from "@/shared/visual-persistence/collection-reconciler.js";
import type { VisualCacheQuery } from "@/shared/visual-persistence/visual-cache.types.js";
import type { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

const MAX_CACHED_PAYMENTS = 100;
const CLIENT_FINANCIAL_QUERY: VisualCacheQuery = { screen: "client-financial", schemaVersion: 1 };

export class ClientFinancialModule {
    private requestId = 0;
    private analysisWindowTimer?: number;
    private pixCountdownTimer?: number;
    private pixCopyFeedbackTimer?: number;
    private listeners?: AbortController;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly api: ClientPaymentsGateway,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void,
        private readonly visualPersistence: VisualPersistenceController
    ) { }

    dispose(): void {
        this.requestId += 1;
        this.visualPersistence.cancel(CLIENT_FINANCIAL_QUERY);
        this.listeners?.abort();
        this.listeners = undefined;
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

        this.dispose();
        this.view.render(model, ".page-content");
        this.view.styleNavButton(baseElements?.desktop_nav_financial);
        const elements = getClientFinancialElements();
        const requestId = ++this.requestId;
        this.listeners = new AbortController();
        const listenerOptions = { signal: this.listeners.signal };
        window.clearTimeout(this.analysisWindowTimer);
        window.clearInterval(this.pixCountdownTimer);
        window.clearTimeout(this.pixCopyFeedbackTimer);
        this.view.registerDisposer(() => this.dispose());
        elements.homeIndex.addEventListener("click", () => this.navigate("home"), listenerOptions);
        elements.back.addEventListener("click", () => this.navigate("home"), listenerOptions);

        let payments: ClientPayment[] = [];
        let renderedPayments: ClientPayment[] = [];
        let nextCursor: string | undefined;
        let totalPaymentCount = 0;
        let loadingMore = false;
        let highlight: FinancialHighlightContract | undefined;
        let summary: PaymentSummaryContract = {
            paymentCount: 0,
            totalAmountCents: 0,
            paidAmountCents: 0,
            remainingAmountCents: 0
        };
        const remember = (): void => {
            const cached = payments.slice(0, MAX_CACHED_PAYMENTS);
            this.visualPersistence.remember<ClientPaymentPage>(CLIENT_FINANCIAL_QUERY, {
                payments: cached,
                page: {
                    limit: cached.length,
                    hasMore: Boolean(nextCursor),
                    ...(nextCursor ? { nextCursor } : {})
                },
                summary: { ...summary },
                ...(highlight ? { highlight: structuredClone(highlight) } : {})
            });
        };
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
            elements.empty.hidden = payments.length > 0;
            elements.paginationStatus.textContent = `${payments.length} de ${totalPaymentCount} pagamentos exibidos`;
            elements.loadMore.hidden = !nextCursor;
            elements.loadMore.disabled = loadingMore;
            elements.loadMore.textContent = loadingMore ? "Carregando..." : "Carregar mais";
            const delta = reconcileCollection(renderedPayments, payments, {
                keyOf: payment => payment.id,
                visuallyEqual: (previous, current) => JSON.stringify(previous) === JSON.stringify(current)
            });
            delta.removed.forEach(({ key }) => paymentNode(elements.list, key)?.remove());
            delta.updated.forEach(({ key, item }) => {
                paymentNode(elements.list, key)?.replaceWith(clientPaymentItem(item, openPix));
            });
            delta.inserted.forEach(({ item }) => elements.list.append(clientPaymentItem(item, openPix)));
            payments.forEach((payment, index) => {
                const node = paymentNode(elements.list, payment.id);
                const nodes = paymentNodes(elements.list);
                if (node && nodes[index] !== node) elements.list.insertBefore(node, nodes[index] ?? null);
            });
            renderedPayments = [...payments];
            scheduleAnalysisWindowRefresh();
        };
        const applyPage = (page: ClientPaymentPage): void => {
            payments = page.payments;
            nextCursor = page.page.nextCursor;
            totalPaymentCount = page.summary.paymentCount;
            summary = page.summary;
            highlight = page.highlight;
            elements.loading.hidden = true;
            renderPayments();
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
                remember();
                window.clearInterval(this.pixCountdownTimer);
                updateAnalysisWindow(result.pix.analysisWindowEndsAt);
                this.pixCountdownTimer = window.setInterval(
                    () => updateAnalysisWindow(result.pix.analysisWindowEndsAt),
                    1000
                );
            } catch (error) {
                if (requestId !== this.requestId) return;
                elements.pixLoading.hidden = true;
                elements.pixFeedback.textContent = error instanceof Error ? error.message : "Não foi possível gerar o código Pix.";
            }
        };
        const closePix = (): void => {
            window.clearInterval(this.pixCountdownTimer);
            elements.pixDialog.close();
        };
        elements.pixClose.addEventListener("click", closePix, listenerOptions);
        elements.pixDialog.addEventListener("cancel", event => { event.preventDefault(); closePix(); }, listenerOptions);
        elements.pixCopy.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(elements.pixCode.value);
                if (requestId !== this.requestId) return;
                elements.pixCopy.textContent = "Código copiado";
                window.clearTimeout(this.pixCopyFeedbackTimer);
                this.pixCopyFeedbackTimer = window.setTimeout(() => {
                    elements.pixCopy.textContent = "Copiar código Pix";
                    this.pixCopyFeedbackTimer = undefined;
                }, 2000);
            } catch {
                if (requestId !== this.requestId) return;
                elements.pixCode.focus();
                elements.pixCode.select();
                elements.pixFeedback.textContent = "Selecione e copie o código manualmente.";
            }
        }, listenerOptions);
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
                summary = page.summary;
                highlight = page.highlight;
                renderPayments();
                remember();
            } catch (error) {
                if (requestId !== this.requestId) return;
                elements.feedback.textContent = error instanceof Error ? error.message : "Não foi possível carregar mais pagamentos.";
            } finally {
                loadingMore = false;
                if (requestId === this.requestId) renderPayments();
            }
        }, listenerOptions);

        await this.visualPersistence.revalidate<ClientPaymentPage>({
            query: CLIENT_FINANCIAL_QUERY,
            presentPreview: snapshot => applyPage(snapshot),
            load: () => this.api.loadPayments(
                this.token,
                undefined,
                payments.length > 0 ? MAX_CACHED_PAYMENTS : undefined
            ),
            publish: snapshot => {
                if (requestId !== this.requestId) return;
                applyPage(snapshot);
                elements.feedback.textContent = "";
            },
            reportError: error => {
                if (requestId !== this.requestId) return;
                elements.loading.hidden = true;
                if (payments.length === 0) {
                    elements.highlight.textContent = "Não foi possível identificar o pagamento em destaque.";
                }
                elements.feedback.textContent = error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os pagamentos.";
            }
        });
    }
}

function paymentNodes(root: ParentNode): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>("[data-payment-id]"));
}

function paymentNode(root: ParentNode, paymentId: string): HTMLElement | undefined {
    return paymentNodes(root).find(node => node.dataset.paymentId === paymentId);
}
