import u from "umbrellajs";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientDetails, AdminClientsGateway, BriefingReportStatus } from "@/admin/infrastructure/clients.api.js";
import {
    getClientManagementElements,
    type ClientManagementElements
} from "@/admin/selectors/client-management.selector.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import type { VisualCacheQuery } from "@/shared/visual-persistence/visual-cache.types.js";
import type { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

type ClientManagementApi = Pick<AdminClientsGateway,
    "loadClient" | "loadBriefingReportStatus" | "generateBriefingReport"
>;

interface ClientManagementSnapshot {
    client: AdminClientDetails;
    reportStatus?: BriefingReportStatus;
}

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
        const visualQuery: VisualCacheQuery = {
            screen: "admin-client-management",
            schemaVersion: 1,
            parameters: { clientId }
        };
        this.view.registerDisposer(() => {
            this.requestId += 1;
            this.visualPersistence.cancel(visualQuery);
        });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        const elements = getClientManagementElements();
        this.prepare(elements, clientId);
        let currentClient: AdminClientDetails | undefined;
        let currentReportStatus: BriefingReportStatus | undefined;

        const remember = (): void => {
            if (!currentClient) return;
            this.visualPersistence.remember<ClientManagementSnapshot>(visualQuery, {
                client: currentClient,
                ...(currentReportStatus ? { reportStatus: currentReportStatus } : {})
            });
        };

        const applySnapshot = (snapshot: ClientManagementSnapshot): void => {
            currentClient = snapshot.client;
            currentReportStatus = snapshot.reportStatus;
            elements.clientName.textContent = snapshot.client.name;
            elements.titleName.textContent = snapshot.client.name;
            this.configureDrive(elements, snapshot.client.driveFolderUrl);
            if (!snapshot.client.hasFilledBriefing) {
                this.showBriefingUnavailable(elements);
            } else if (snapshot.reportStatus) {
                this.bindReportAction(
                    clientId,
                    elements,
                    snapshot.reportStatus.exists,
                    snapshot.reportStatus.folderUrl,
                    requestId,
                    status => {
                        currentReportStatus = status;
                        remember();
                    }
                );
            } else {
                this.bindReportRetry(clientId, elements, requestId, status => {
                    currentReportStatus = status;
                    remember();
                });
            }
        };

        try {
            let preview: ClientManagementSnapshot | undefined;
            await this.visualPersistence.revalidate<ClientManagementSnapshot>({
                query: visualQuery,
                presentPreview: snapshot => {
                    preview = snapshot;
                    applySnapshot(snapshot);
                },
                load: async () => {
                    const client = await this.api.loadClient(this.session, clientId);
                    if (!client.hasFilledBriefing) return { client };
                    try {
                        const reportStatus = await this.api.loadBriefingReportStatus(this.session, clientId);
                        return { client, reportStatus };
                    } catch (error) {
                        console.error("Erro ao verificar relatório do briefing:", error);
                        return { client, ...(preview?.reportStatus ? { reportStatus: preview.reportStatus } : {}) };
                    }
                },
                publish: snapshot => {
                    if (requestId === this.requestId) applySnapshot(snapshot);
                },
                reportError: error => {
                    if (requestId !== this.requestId) return;
                    console.error("Erro ao carregar o cliente:", error);
                    if (!preview) this.navigateToClients();
                }
            });
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao carregar o cliente:", error);
            this.navigateToClients();
        }
    }

    private showBriefingUnavailable(elements: ClientManagementElements): void {
        elements.briefingReport.disabled = true;
        elements.briefingReport.classList.remove("client-management-report-loading");
        elements.briefingReport.classList.add("client-management-report-unavailable");
        elements.briefingReportLabel.textContent = "Cliente ainda não preencheu o briefing";
    }

    private bindReportRetry(
        clientId: string,
        elements: ClientManagementElements,
        requestId: number,
        onLoaded?: (status: BriefingReportStatus) => void
    ): void {
        elements.briefingReport.classList.remove("client-management-report-loading");
        elements.briefingReport.disabled = false;
        elements.briefingReportLabel.textContent = "Tentar novamente";
        elements.briefingReport.onclick = () => {
            elements.briefingReport.disabled = true;
            elements.briefingReport.classList.add("client-management-report-loading");
            elements.briefingReportLabel.textContent = "Verificando...";
            void this.loadReport(clientId, elements, requestId, onLoaded);
        };
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
        requestId: number,
        onLoaded?: (status: BriefingReportStatus) => void
    ): Promise<void> {
        try {
            const status = await this.api.loadBriefingReportStatus(this.session, clientId);
            if (requestId !== this.requestId) return;
            onLoaded?.(status);
            this.bindReportAction(clientId, elements, status.exists, status.folderUrl, requestId, onLoaded);
        } catch (error) {
            if (requestId !== this.requestId) return;
            console.error("Erro ao verificar relatório do briefing:", error);
            this.bindReportRetry(clientId, elements, requestId, onLoaded);
        }
    }

    private bindReportAction(
        clientId: string,
        elements: ClientManagementElements,
        exists: boolean,
        folderUrl: string | undefined,
        requestId: number,
        onLoaded?: (status: BriefingReportStatus) => void
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
                onLoaded?.(status);
                this.bindReportAction(clientId, elements, status.exists, status.folderUrl, requestId, onLoaded);
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
