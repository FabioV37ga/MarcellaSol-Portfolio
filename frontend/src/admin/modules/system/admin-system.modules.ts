import u from "umbrellajs";
import { getNewClientElements, type newClientElements } from "@/admin/selectors/new-client.selector.js";
import type { system } from "@/admin/templates/interface.js";
import type { AdminRoute } from "@/admin/navigation/admin-system.router.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import type { ClientCreationFlow } from "../client-creation/client-creation.flow.js";
import type { AdminSession, AdminSystemApi } from "@/admin/infrastructure/admin-system.api.js";
import { AdminClientProposalsModule } from "../clients/admin-client-proposals.module.js";
import { AdminHomeModule } from "./admin-home.module.js";
import { AdminClientsModule } from "../clients/admin-clients.module.js";
import { AdminClientManagementModule } from "../clients/admin-client-management.module.js";
import { AdminClientFinancialModule } from "../clients/admin-client-financial.module.js";
import { AdminShellModule } from "./admin-shell.module.js";
import { SessionVisualCache } from "@/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

export class AdminSystemModules {
    private newClient?: newClientElements;
    private readonly clientProposals: AdminClientProposalsModule;
    private readonly home: AdminHomeModule;
    private readonly clients: AdminClientsModule;
    private readonly clientManagement: AdminClientManagementModule;
    private readonly clientFinancial: AdminClientFinancialModule;
    private readonly shell: AdminShellModule;
    private readonly visualPersistence: VisualPersistenceController;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly clientCreation: ClientCreationFlow,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void
    ) {
        this.visualPersistence = new VisualPersistenceController(new SessionVisualCache({
            role: "admin",
            subjectId: session.subjectId
        }));
        this.shell = new AdminShellModule(
            view,
            models.base!,
            session,
            () => navigate("home"),
            () => navigate("clients"),
            () => this.visualPersistence.dispose()
        );
        this.clientProposals = new AdminClientProposalsModule(
            view,
            models,
            api,
            session,
            navigate,
            () => this.shell.clientsNavigation,
            this.visualPersistence
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
            () => this.shell.clientsNavigation,
            this.visualPersistence
        );
        this.clientManagement = new AdminClientManagementModule(
            view,
            models.clientManagement!,
            api,
            session,
            () => navigate("clients"),
            clientId => navigate("client-proposals", clientId),
            clientId => navigate("client-financial", clientId),
            () => this.shell.clientsNavigation,
            this.visualPersistence
        );
        this.clientFinancial = new AdminClientFinancialModule(
            view,
            models.clientFinancial!,
            api,
            session,
            () => navigate("clients"),
            clientId => navigate("client-management", clientId),
            () => this.shell.clientsNavigation,
            this.visualPersistence
        );
    }

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.shell.mount(); break;
            case "home": this.home.mount(); break;
            case "clients":
                this.clientCreation.reset();
                this.clients.mount();
                break;
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
        const credentials = this.clientCreation.getCredentials();
        if (credentials) {
            this.newClient.nameField.value = credentials.name;
            this.newClient.loginField.value = credentials.login;
            this.newClient.passwordField.value = credentials.password;
        }
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
