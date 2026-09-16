import u from "umbrellajs";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import {
    getClientManagementElements,
    type ClientManagementElements
} from "@/admin/selectors/client-management.selector.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";

type ClientManagementApi = Pick<AdminClientsGateway,
    "loadClient" | "loadBriefingReportStatus" | "generateBriefingReport"
>;

export class AdminClientManagementModule {
    private requestId = 0;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly api: ClientManagementApi,
        private readonly session: AdminSession,
        private readonly navigateToClients: () => void,
        private readonly navigateToProposals: (clientId: string) => void,
        private readonly navigateToFinancial: (clientId: string) => void,
        private readonly clientsNavigation: () => HTMLElement | undefined
    ) { }

    async mount(clientId?: string): Promise<void> {
        if (!clientId) {
            this.navigateToClients();
            return;
        }

        this.view.render(this.template, ".page-content");
        const requestId = ++this.requestId;
        this.view.registerDisposer(() => { this.requestId += 1; });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        const elements = getClientManagementElements();
        this.prepare(elements, clientId);

        try {
            const client = await this.api.loadClient(this.session, clientId);
            if (requestId !== this.requestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            this.configureDrive(elements, client.driveFolderUrl);

            if (client.hasFilledBriefing) {
                await this.loadReport(clientId, elements, requestId);
            } else {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.remove("client-management-report-loading");
                elements.briefingReport.classList.add("client-management-report-unavailable");
                elements.briefingReportLabel.textContent = "Cliente ainda não preencheu o briefing";
            }
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao carregar o cliente:", error);
            this.navigateToClients();
        }
    }

    private prepare(elements: ClientManagementElements, clientId: string): void {
        this.configureDrive(elements);
        elements.briefingReport.disabled = true;
        elements.briefingReport.classList.add("client-management-report-loading");
        elements.briefingReport.classList.remove("client-management-report-unavailable");
        elements.briefingReportLabel.textContent = "Verificando...";
        u(elements.briefingReport).off("click");
        elements.briefingReport.onclick = null;
        u(elements.clientsIndex).off("click").on("click", this.navigateToClients);
        u(elements.back).off("click").on("click", this.navigateToClients);
        u(elements.proposals).off("click").on("click", () => this.navigateToProposals(clientId));
        u(elements.financial).off("click").on("click", () => this.navigateToFinancial(clientId));
    }

    private configureDrive(elements: ClientManagementElements, folderUrl?: string): void {
        if (folderUrl) {
            elements.drive.href = folderUrl;
            elements.drive.target = "_blank";
            elements.drive.rel = "noopener noreferrer";
            elements.drive.removeAttribute("aria-disabled");
            elements.drive.classList.remove("client-management-action-disabled");
            return;
        }
        elements.drive.removeAttribute("href");
        elements.drive.setAttribute("aria-disabled", "true");
        elements.drive.classList.add("client-management-action-disabled");
    }

    private async loadReport(
        clientId: string,
        elements: ClientManagementElements,
        requestId: number
    ): Promise<void> {
        try {
            const status = await this.api.loadBriefingReportStatus(this.session, clientId);
            if (requestId !== this.requestId) return;
            this.bindReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao verificar relatório do briefing:", error);
            elements.briefingReport.classList.remove("client-management-report-loading");
            elements.briefingReport.disabled = false;
            elements.briefingReportLabel.textContent = "Tentar novamente";
            elements.briefingReport.onclick = () => {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.add("client-management-report-loading");
                elements.briefingReportLabel.textContent = "Verificando...";
                void this.loadReport(clientId, elements, requestId);
            };
        }
    }

    private bindReportAction(
        clientId: string,
        elements: ClientManagementElements,
        exists: boolean,
        folderUrl: string | undefined,
        requestId: number
    ): void {
        const button = elements.briefingReport;
        button.disabled = false;
        button.classList.remove("client-management-report-loading", "client-management-report-unavailable");
        u(button).off("click");
        button.onclick = null;

        if (exists && folderUrl) {
            elements.briefingReportLabel.textContent = "Acessar";
            button.onclick = () => window.open(folderUrl, "_blank", "noopener,noreferrer");
            return;
        }

        elements.briefingReportLabel.textContent = "Gerar relatório";
        button.onclick = () => {
            button.disabled = true;
            button.classList.add("client-management-report-loading");
            elements.briefingReportLabel.textContent = "Gerando relatório...";
            void this.api.generateBriefingReport(this.session, clientId).then(status => {
                if (requestId !== this.requestId) return;
                this.bindReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
            }).catch(error => {
                if (requestId !== this.requestId) return;
                console.error("Erro ao gerar relatório do briefing:", error);
                button.disabled = false;
                button.classList.remove("client-management-report-loading");
                elements.briefingReportLabel.textContent = "Tentar novamente";
            });
        };
    }
}
