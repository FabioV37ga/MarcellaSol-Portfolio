import u from "umbrellajs";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import type { AdminPaymentsGateway } from "@/admin/infrastructure/payments.api.js";
import { getClientFinancialElements } from "@/admin/selectors/client-financial.selector.js";
import { ClientFinancialManager } from "@/admin/ui/client-financial-manager.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";

export class AdminClientFinancialModule {
    private requestId = 0;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly api: AdminPaymentsGateway & Pick<AdminClientsGateway, "loadClient">,
        private readonly session: AdminSession,
        private readonly navigateToClients: () => void,
        private readonly navigateToClient: (clientId: string) => void,
        private readonly clientsNavigation: () => HTMLElement | undefined
    ) { }

    async mount(clientId?: string): Promise<void> {
        if (!clientId) {
            this.navigateToClients();
            return;
        }

        this.view.render(this.template, ".page-content");
        const requestId = ++this.requestId;
        let manager: ClientFinancialManager | undefined;
        this.view.registerDisposer(() => {
            this.requestId += 1;
            manager?.dispose();
        });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        const elements = getClientFinancialElements();
        u(elements.clientsIndex).off("click").on("click", this.navigateToClients);
        u(elements.clientIndex).off("click").on("click", () => this.navigateToClient(clientId));
        u(elements.back).off("click").on("click", () => this.navigateToClient(clientId));

        try {
            const [client, paymentPage] = await Promise.all([
                this.api.loadClient(this.session, clientId),
                this.api.loadPayments(this.session, clientId)
            ]);
            if (requestId !== this.requestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            manager = new ClientFinancialManager(elements, this.api, this.session, clientId, paymentPage);
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao carregar financeiro do cliente:", error);
            this.navigateToClients();
        }
    }
}
