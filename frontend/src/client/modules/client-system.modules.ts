import u from "umbrellajs";
import ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import { getHomeElements } from "../selectors/home.selector.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { ClientSystemApi, type ClientPayment, type ClientProposal } from "../infrastructure/client-system.api.js";
import { clientApprovalItem } from "../templates/client-approval-item.template.js";
import { getStagesApprovalsElements } from "../selectors/stages-approvals.selector.js";
import { logoutSession } from "@/shared/session/logout.js";
import { renderProjectStages } from "@/shared/project-stages.js";
import { getClientFinancialElements } from "../selectors/financial.selector.js";
import { clientPaymentHighlight, clientPaymentItem, type PaymentPartReference } from "../templates/client-payment-item.template.js";

export class ClientSystemModules {
    private baseElements?: baseElements;
    private financialRequestId = 0;
    private financialAnalysisWindowTimer?: number;
    private pixCountdownTimer?: number;
    private pixCopyFeedbackTimer?: number;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly briefing: ClientBriefingController,
        private readonly api: ClientSystemApi,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) {}

    mount(route: ClientRoute, briefingStep?: number): void {
        if (route !== "financial") {
            this.financialRequestId += 1;
            window.clearTimeout(this.financialAnalysisWindowTimer);
            window.clearInterval(this.pixCountdownTimer);
        }
        document.body.classList.toggle("client-briefing-active", route === "briefing");
        switch (route) {
            case "base":
                this.mountBase();
                break;
            case "home":
                this.mountHome();
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "stages-approvals":
                void this.mountStagesApprovals();
                break;
            case "financial":
                void this.mountFinancial();
                break;
        }
    }

    private mountHome(): void {
        this.view.render(this.models.home, ".page-content");
        this.view.styleNavButton(this.baseElements?.desktop_nav_home);
        const home = getHomeElements();
        u(home.stagesProcesses)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
        u(home.financial)
            .off("click")
            .on("click", () => this.navigate("financial"));
    }

    private mountBase(): void {
        this.view.render(this.models.base, "body");
        this.baseElements = getBaseElements();
        this.mountMobileNavigation();
        this.view.styleNavButton(this.baseElements.desktop_nav_home);
        u(this.baseElements.desktop_logout).off("click").on("click", () => {
            void logoutSession("client", this.token);
        });

        u(this.baseElements.desktop_nav_home)
            .off("click")
            .on("click", () => this.navigate("home"));
        u(this.baseElements.desktop_nav_client)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
        u(this.baseElements.desktop_nav_financial)
            .off("click")
            .on("click", () => this.navigate("financial"));
    }

    private async mountFinancial(): Promise<void> {
        const model = this.models.financial;
        if (!model) {
            console.error('A view "financial" não foi encontrada para o cliente.');
            return;
        }

        this.view.render(model, ".page-content");
        this.view.styleNavButton(this.baseElements?.desktop_nav_financial);
        const elements = getClientFinancialElements();
        const requestId = ++this.financialRequestId;
        window.clearTimeout(this.financialAnalysisWindowTimer);
        window.clearInterval(this.pixCountdownTimer);
        window.clearTimeout(this.pixCopyFeedbackTimer);
        this.view.registerDisposer(() => {
            this.financialRequestId += 1;
            window.clearTimeout(this.financialAnalysisWindowTimer);
            window.clearInterval(this.pixCountdownTimer);
            window.clearTimeout(this.pixCopyFeedbackTimer);
            this.financialAnalysisWindowTimer = undefined;
            this.pixCountdownTimer = undefined;
            this.pixCopyFeedbackTimer = undefined;
        });
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        let payments: ClientPayment[] = [];
        const scheduleAnalysisWindowRefresh = (): void => {
            window.clearTimeout(this.financialAnalysisWindowTimer);
            const analysisWindowEnds = payments.reduce<Array<ClientPayment["downPayment"]>>((parts, payment) => {
                parts.push(payment.downPayment, ...payment.installments);
                return parts;
            }, [])
                .map(part => part.pix ? new Date(part.pix.analysisWindowEndsAt).getTime() : 0)
                .filter(value => value > Date.now());
            if (!analysisWindowEnds.length) return;
            this.financialAnalysisWindowTimer = window.setTimeout(
                () => renderPayments(),
                Math.min(...analysisWindowEnds) - Date.now() + 100
            );
        };
        const renderPayments = (): void => {
            const openPix = (part: PaymentPartReference): void => { void showPix(part); };
            elements.highlight.replaceChildren(clientPaymentHighlight(payments, openPix));
            elements.list.replaceChildren();
            elements.empty.hidden = payments.length > 0;
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
                if (requestId !== this.financialRequestId || !elements.pixDialog.open) return;
                const index = payments.findIndex(payment => payment.id === result.payment.id);
                if (index >= 0) payments[index] = result.payment;
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

        try {
            payments = await this.api.loadPayments(this.token);
            if (requestId !== this.financialRequestId) return;
            elements.loading.hidden = true;
            renderPayments();
        } catch (error) {
            if (requestId !== this.financialRequestId) return;
            elements.loading.hidden = true;
            elements.highlight.textContent = "Não foi possível identificar o pagamento em destaque.";
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar os pagamentos.";
        }
    }

    private async mountStagesApprovals(): Promise<void> {
        const model = this.models["stages-approvals"];
        if (!model) {
            console.error('A view "stages-approvals" não foi encontrada para o cliente.');
            return;
        }

        this.view.render(model, ".page-content");
        this.view.styleNavButton(this.baseElements?.desktop_nav_client);
        const elements = getStagesApprovalsElements();
        const progressRoot = document.querySelector(".project-progress") ?? document;
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        let approvedProposalId = "";
        let rejectedProposalId = "";
        const replaceProposal = (proposal: ClientProposal): void => {
            const current = elements.list.querySelector<HTMLElement>(`[data-proposal-id="${CSS.escape(proposal._id)}"]`);
            const replacement = renderProposal(proposal);
            current?.replaceWith(replacement);
        };
        const renderProposal = (proposal: ClientProposal): HTMLElement => {
            const card = clientApprovalItem(proposal);
            card.querySelector<HTMLButtonElement>(".client-approval-approve")?.addEventListener("click", () => {
                approvedProposalId = proposal._id;
                elements.feedback.textContent = "";
                elements.approveComment.value = "";
                elements.approveFeedback.textContent = "";
                elements.approveDialog.showModal();
                elements.approveComment.focus();
            });
            card.querySelector<HTMLButtonElement>(".client-approval-reject")?.addEventListener("click", () => {
                rejectedProposalId = proposal._id;
                elements.rejectComment.value = "";
                elements.rejectRevisionConfirmation.checked = false;
                elements.rejectFeedback.textContent = "";
                elements.rejectDialog.showModal();
                elements.rejectComment.focus();
            });
            return card;
        };

        elements.approveCancel.addEventListener("click", () => elements.approveDialog.close());
        elements.approveDialog.addEventListener("close", () => {
            approvedProposalId = "";
            elements.approveComment.value = "";
            elements.approveFeedback.textContent = "";
        });
        elements.approveConfirm.addEventListener("click", async () => {
            const comment = elements.approveComment.value.trim();
            if (!comment) {
                elements.approveFeedback.textContent = "Digite um comentário antes de confirmar.";
                elements.approveComment.focus();
                return;
            }
            if (!approvedProposalId) return;
            elements.approveConfirm.disabled = true;
            elements.approveCancel.disabled = true;
            elements.approveFeedback.textContent = "";
            try {
                const result = await this.api.approveProposal(this.token, approvedProposalId, comment);
                replaceProposal(result.proposal);
                renderProjectStages(progressRoot, result.projectStages, result.currentStageKey);
                elements.approveDialog.close();
            } catch (error) {
                elements.approveFeedback.textContent = error instanceof Error
                    ? error.message
                    : "Não foi possível aprovar a proposta.";
            } finally {
                elements.approveConfirm.disabled = false;
                elements.approveCancel.disabled = false;
            }
        });

        elements.rejectCancel.addEventListener("click", () => elements.rejectDialog.close());
        elements.rejectDialog.addEventListener("close", () => {
            rejectedProposalId = "";
            elements.rejectComment.value = "";
            elements.rejectRevisionConfirmation.checked = false;
            elements.rejectFeedback.textContent = "";
        });
        elements.rejectConfirm.addEventListener("click", async () => {
            const comment = elements.rejectComment.value.trim();
            if (!comment) {
                elements.rejectFeedback.textContent = "Digite um comentário antes de confirmar.";
                elements.rejectComment.focus();
                return;
            }
            if (!elements.rejectRevisionConfirmation.checked) {
                elements.rejectFeedback.textContent = "Confirme o uso de 1 rodada de alterações.";
                elements.rejectRevisionConfirmation.focus();
                return;
            }
            if (!rejectedProposalId) return;
            elements.rejectConfirm.disabled = true;
            elements.rejectCancel.disabled = true;
            elements.rejectFeedback.textContent = "";
            try {
                const result = await this.api.beatProposal(
                    this.token,
                    rejectedProposalId,
                    comment,
                    elements.rejectRevisionConfirmation.checked
                );
                replaceProposal(result.proposal);
                renderProjectStages(progressRoot, result.projectStages, result.currentStageKey);
                elements.rejectDialog.close();
            } catch (error) {
                elements.rejectFeedback.textContent = error instanceof Error
                    ? error.message
                    : "Não foi possível solicitar a alteração da proposta.";
            } finally {
                elements.rejectConfirm.disabled = false;
                elements.rejectCancel.disabled = false;
            }
        });

        try {
            const project = await this.api.loadProposals(this.token);
            renderProjectStages(progressRoot, project.projectStages, project.currentStageKey);
            const proposals = project.proposals;
            elements.list.replaceChildren();
            if (proposals.length === 0) {
                elements.loading.hidden = true;
                elements.empty.hidden = false;
                return;
            }
            elements.empty.hidden = true;
            const items = document.createDocumentFragment();
            proposals.forEach(proposal => items.append(renderProposal(proposal)));
            elements.list.append(items);
        } catch (error) {
            elements.loading.hidden = true;
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar as aprovações.";
            return;
        }

        elements.loading.hidden = true;
    }

    private mountMobileNavigation(): void {
        const expandButton = this.baseElements?.mobile_expand_button;
        const desktopNavigation = document.querySelector<HTMLElement>(".desktop-navigation");
        const menu = document.querySelector<HTMLElement>("#client-mobile-navigation");
        if (!expandButton || !desktopNavigation || !menu) return;
        const globalListeners = new AbortController();
        this.view.registerDisposer(() => globalListeners.abort(), "body");

        const closeMenu = (): void => {
            menu.classList.remove("mobile-navigation-menu-open");
            menu.setAttribute("aria-hidden", "true");
            expandButton.setAttribute("aria-expanded", "false");
            expandButton.setAttribute("aria-label", "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace("fa-times", "fa-bars");
        };

        const toggleMenu = (): void => {
            const willOpen = !menu.classList.contains("mobile-navigation-menu-open");
            menu.classList.toggle("mobile-navigation-menu-open", willOpen);
            menu.setAttribute("aria-hidden", String(!willOpen));
            expandButton.setAttribute("aria-expanded", String(willOpen));
            expandButton.setAttribute("aria-label", willOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace(
                willOpen ? "fa-bars" : "fa-times",
                willOpen ? "fa-times" : "fa-bars"
            );
        };

        expandButton.addEventListener("click", toggleMenu);
        expandButton.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggleMenu();
        });

        const desktopItems = Array.from(desktopNavigation.querySelectorAll<HTMLElement>(".desktop-navigation-item"));
        const mobileItems = Array.from(menu.querySelectorAll<HTMLElement>(".mobile-navigation-item"));
        mobileItems.forEach((item, index) => {
            item.addEventListener("click", () => {
                desktopItems[index]?.click();
                mobileItems.forEach(mobileItem => mobileItem.classList.remove("mobile-nav-item-selected"));
                item.classList.add("mobile-nav-item-selected");
                closeMenu();
            });
        });

        const desktopLogout = document.querySelector<HTMLElement>(".logout-desktop");
        menu.querySelector<HTMLElement>(".logout-mobile")?.addEventListener("click", () => {
            desktopLogout?.click();
            closeMenu();
        });

        document.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menu.contains(target) && !expandButton.contains(target)) closeMenu();
        }, { signal: globalListeners.signal });
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu();
        }, { signal: globalListeners.signal });
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 900) closeMenu();
        }, { signal: globalListeners.signal });
    }

    private mountBriefing(step?: number): void {
        const template = this.briefing.getTemplate();
        if (!template.isConnected) {
            this.view.mountOwned(template, "body");
            this.briefing.initialize();
        }
        if (Number.isInteger(step)) this.briefing.navigateToStep(step!);
    }
}
