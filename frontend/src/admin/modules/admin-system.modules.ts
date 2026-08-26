import u from "umbrellajs";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import { getClientsElements, type clientsElements } from "../selectors/clients.selector.js";
import { getHomeElements, type homeElements } from "../selectors/home.selector.ts.js";
import { getNewClientElements, type newClientElements } from "../selectors/new-client.selector.js";
import type { system } from "../templates/interface.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import type { ClientCreationFlow } from "./client-creation.flow.js";
import type { AdminSession, AdminSystemApi } from "../infrastructure/admin-system.api.js";
import { clientListItem } from "../templates/client-list-item.template.js";
import { getClientManagementElements } from "../selectors/client-management.selector.js";

export class AdminSystemModules {
    private base?: baseElements;
    private home?: homeElements;
    private clients?: clientsElements;
    private newClient?: newClientElements;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly clientCreation: ClientCreationFlow,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void
    ) {}

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.mountBase(); break;
            case "home": this.mountHome(); break;
            case "clients": this.mountClients(); break;
            case "client-management": void this.mountClientManagement(id); break;
            case "new-client": this.mountNewClient(); break;
            case "briefing-home":
            case "briefing-investment":
            case "briefing-rooms":
            case "briefing-finish":
                this.clientCreation.mount(route);
                break;
        }
    }

    private mountBase(): void {
        this.view.render(this.models.base!, "body");
        this.base = getBaseElements();
        u(this.base.desktop_nav_home).off("click").on("click", () => this.navigate("home"));
        u(this.base.desktop_nav_client).off("click").on("click", () => this.navigate("clients"));
    }

    private mountHome(): void {
        this.view.render(this.models.home!, ".page-content");
        this.home = getHomeElements();
        this.view.styleNavButton(this.base!.desktop_nav_home);
        u(this.home.access_client).off("click").on("click", () => this.navigate("clients"));
    }

    private mountClients(): void {
        this.view.render(this.models.client!, ".page-content");
        this.clients = getClientsElements();
        this.view.styleNavButton(this.base!.desktop_nav_client);
        u(this.clients.new_client).off("click").on("click", () => this.navigate("new-client"));
        void this.mountClientList();
    }

    private async mountClientList(): Promise<void> {
        try {
            const clients = await this.api.loadClients(this.session);
            if (!this.clients) return;

            this.clients.list
                .querySelectorAll(":scope > .client-list-client")
                .forEach(item => item.remove());

            const items = document.createDocumentFragment();
            clients.forEach(client => {
                const item = clientListItem(client);
                u(item).on("click", () => this.navigate("client-management", client.id));
                items.append(item);
            });
            this.clients.list.append(items);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        }
    }

    private async mountClientManagement(id?: string): Promise<void> {
        if (!id || !this.models.clientManagement) {
            this.navigate("clients");
            return;
        }

        this.view.render(this.models.clientManagement, ".page-content");
        this.view.styleNavButton(this.base!.desktop_nav_client);
        const elements = getClientManagementElements();
        u(elements.clientsIndex).off("click").on("click", () => this.navigate("clients"));
        u(elements.back).off("click").on("click", () => this.navigate("clients"));

        try {
            const client = await this.api.loadClient(this.session, id);
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;

            if (client.driveFolderUrl) {
                elements.drive.href = client.driveFolderUrl;
                elements.drive.target = "_blank";
                elements.drive.rel = "noopener noreferrer";
                elements.drive.removeAttribute("aria-disabled");
                elements.drive.classList.remove("client-management-action-disabled");
            } else {
                elements.drive.removeAttribute("href");
                elements.drive.setAttribute("aria-disabled", "true");
                elements.drive.classList.add("client-management-action-disabled");
            }

            if (client.hasFilledBriefing) {
                await this.mountBriefingReport(id, elements);
            } else {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.add("client-management-report-unavailable");
                elements.briefingReportLabel.textContent = "Cliente ainda não preencheu o briefing";
            }
        } catch (error) {
            console.error("Erro ao carregar o cliente:", error);
            this.navigate("clients");
        }
    }

    private async mountBriefingReport(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>
    ): Promise<void> {
        try {
            const status = await this.api.loadBriefingReportStatus(this.session, clientId);
            this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl);
        } catch (error) {
            console.error("Erro ao verificar relatório do briefing:", error);
            elements.briefingReport.disabled = false;
            elements.briefingReportLabel.textContent = "Tentar novamente";
            u(elements.briefingReport).off("click").on("click", () => {
                elements.briefingReport.disabled = true;
                elements.briefingReportLabel.textContent = "Verificando...";
                void this.mountBriefingReport(clientId, elements);
            });
        }
    }

    private bindBriefingReportAction(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>,
        exists: boolean,
        folderUrl?: string
    ): void {
        const button = elements.briefingReport;
        button.disabled = false;
        button.classList.remove("client-management-report-loading");
        button.classList.remove("client-management-report-unavailable");
        u(button).off("click");

        if (exists && folderUrl) {
            elements.briefingReportLabel.textContent = "Acessar";
            u(button).on("click", () => {
                window.open(folderUrl, "_blank", "noopener,noreferrer");
            });
            return;
        }

        elements.briefingReportLabel.textContent = "Gerar relatório";
        u(button).on("click", () => {
            button.disabled = true;
            button.classList.add("client-management-report-loading");
            elements.briefingReportLabel.textContent = "Gerando relatório...";
            void this.api.generateBriefingReport(this.session, clientId)
                .then(status => {
                    this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl);
                })
                .catch(error => {
                    console.error("Erro ao gerar relatório do briefing:", error);
                    button.disabled = false;
                    button.classList.remove("client-management-report-loading");
                    elements.briefingReportLabel.textContent = "Tentar novamente";
                });
        });
    }

    private mountNewClient(): void {
        this.view.render(this.models.newClient!, ".page-content");
        this.newClient = getNewClientElements();
        u(this.newClient.cancel).off("click").on("click", () => this.navigate("clients"));
        u(this.newClient.root).off("click").on("click", () => this.navigate("clients"));
        u(this.newClient.confirm).off("click").on("click", () => {
            void this.clientCreation.start(
                this.newClient!.nameField.value,
                this.newClient!.loginField.value,
                this.newClient!.passwordField.value
            );
        });
    }
}
