import u from "umbrellajs";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import type { AdminPaymentsGateway } from "@/admin/infrastructure/payments.api.js";
import type { PaymentPage } from "@/admin/infrastructure/payments.api.js";
import { getClientFinancialElements } from "@/admin/selectors/client-financial.selector.js";
import { ClientFinancialManager } from "@/admin/ui/client-financial-manager.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import type { VisualCacheQuery } from "@/shared/visual-persistence/visual-cache.types.js";
import type { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

const MAX_CACHED_PAYMENTS = 100;

export class AdminClientFinancialModule {
    private requestId = 0;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly api: AdminPaymentsGateway & Pick<AdminClientsGateway, "loadClient">,
        private readonly session: AdminSession,
        private readonly navigateToClients: () => void,
        private readonly navigateToClient: (clientId: string) => void,
        private readonly clientsNavigation: () => HTMLElement | undefined,
        private readonly visualPersistence: VisualPersistenceController
    ) { }

    async mount(clientId?: string): Promise<void> {
        if (!clientId) {
            this.navigateToClients();
            return;
        }

        this.view.render(this.template, ".page-content");
        const requestId = ++this.requestId;
        let manager: ClientFinancialManager | undefined;
        const visualQuery: VisualCacheQuery = {
            screen: "admin-client-financial",
            schemaVersion: 1,
            parameters: { clientId }
        };
        this.view.registerDisposer(() => {
            this.requestId += 1;
            this.visualPersistence.cancel(visualQuery);
            manager?.dispose();
        });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        const elements = getClientFinancialElements();
        u(elements.clientsIndex).off("click").on("click", this.navigateToClients);
        u(elements.clientIndex).off("click").on("click", () => this.navigateToClient(clientId));
        u(elements.back).off("click").on("click", () => this.navigateToClient(clientId));

        const applyPage = (paymentPage: PaymentPage): void => {
            if (manager) {
                manager.replacePage(paymentPage);
                return;
            }
            manager = new ClientFinancialManager(
                elements,
                this.api,
                this.session,
                clientId,
                paymentPage,
                snapshot => this.visualPersistence.remember(visualQuery, snapshot)
            );
        };

        try {
            let hasPreview = false;
            const [client] = await Promise.all([
                this.api.loadClient(this.session, clientId),
                this.visualPersistence.revalidate<PaymentPage>({
                    query: visualQuery,
                    presentPreview: snapshot => {
                        hasPreview = true;
                        applyPage(snapshot);
                    },
                    load: () => this.api.loadPayments(
                        this.session,
                        clientId,
                        undefined,
                        hasPreview ? MAX_CACHED_PAYMENTS : undefined
                    ),
                    publish: snapshot => {
                        if (requestId === this.requestId) applyPage(snapshot);
                    },
                    reportError: (error, context) => {
                        if (requestId !== this.requestId) return;
                        console.error("Erro ao carregar financeiro do cliente:", error);
                        if (context.hasPreview) {
                            elements.feedback.textContent = error instanceof Error
                                ? error.message
                                : "Não foi possível atualizar os pagamentos.";
                        }
                    }
                })
            ]);
            if (requestId !== this.requestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            if (!manager) this.navigateToClients();
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao carregar financeiro do cliente:", error);
            this.navigateToClients();
        }
    }
}
