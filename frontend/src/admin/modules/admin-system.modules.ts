import u from "umbrellajs";
import { getNewClientElements, type newClientElements } from "../selectors/new-client.selector.js";
import type { system } from "../templates/interface.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import type { ClientCreationFlow } from "./client-creation.flow.js";
import type { AdminSession, AdminSystemApi } from "../infrastructure/admin-system.api.js";
import { AdminClientProposalsModule } from "./admin-client-proposals.module.js";
import { AdminHomeModule } from "./admin-home.module.js";
import { AdminClientsModule } from "./admin-clients.module.js";
import { AdminClientManagementModule } from "./admin-client-management.module.js";
import { AdminClientFinancialModule } from "./admin-client-financial.module.js";
import { AdminShellModule } from "./admin-shell.module.js";

export class AdminSystemModules {
    private newClient?: newClientElements;
    private readonly clientProposals: AdminClientProposalsModule;
    private readonly home: AdminHomeModule;
    private readonly clients: AdminClientsModule;
    private readonly clientManagement: AdminClientManagementModule;
    private readonly clientFinancial: AdminClientFinancialModule;
    private readonly shell: AdminShellModule;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly clientCreation: ClientCreationFlow,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void
    ) {
        this.shell = new AdminShellModule(
            view,
            models.base!,
            session,
            () => navigate("home"),
            () => navigate("clients")
        );
        this.clientProposals = new AdminClientProposalsModule(
            view,
            models,
            api,
            session,
            navigate,
            () => this.shell.clientsNavigation
        );
        this.home = new AdminHomeModule(
            view,
            models.home!,
            () => navigate("clients"),
            () => this.shell.homeNavigation
        );
        this.clients = new AdminClientsModule(
            view,
            models.client!,
            api,
            session,
            () => navigate("new-client"),
            clientId => navigate("client-management", clientId),
            () => this.shell.clientsNavigation
        );
        this.clientManagement = new AdminClientManagementModule(
            view,
            models.clientManagement!,
            api,
            session,
            () => navigate("clients"),
            clientId => navigate("client-proposals", clientId),
            clientId => navigate("client-financial", clientId),
            () => this.shell.clientsNavigation
        );
        this.clientFinancial = new AdminClientFinancialModule(
            view,
            models.clientFinancial!,
            api,
            session,
            () => navigate("clients"),
            clientId => navigate("client-management", clientId),
            () => this.shell.clientsNavigation
        );
    }

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.shell.mount(); break;
            case "home": this.home.mount(); break;
            case "clients": this.clients.mount(); break;
            case "client-management": void this.clientManagement.mount(id); break;
            case "client-proposals": void this.clientProposals.mount(id); break;
            case "client-financial": void this.clientFinancial.mount(id); break;
            case "new-client": this.mountNewClient(); break;
            case "briefing-home":
            case "briefing-investment":
            case "briefing-rooms":
            case "briefing-finish":
                this.clientCreation.mount(route);
                break;
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
