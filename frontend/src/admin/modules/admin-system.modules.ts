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
        private readonly navigate: (route: AdminRoute) => void
    ) {}

    mount(route: AdminRoute): void {
        switch (route) {
            case "base": this.mountBase(); break;
            case "home": this.mountHome(); break;
            case "clients": this.mountClients(); break;
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
            clients.forEach(client => items.append(clientListItem(client)));
            this.clients.list.append(items);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        }
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
