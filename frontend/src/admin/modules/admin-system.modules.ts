import u from "umbrellajs";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import { getNewClientElements, type newClientElements } from "../selectors/new-client.selector.js";
import type { system } from "../templates/interface.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import type { ClientCreationFlow } from "./client-creation.flow.js";
import type { AdminSession, AdminSystemApi } from "../infrastructure/admin-system.api.js";
import { logoutSession } from "@/shared/session/logout.js";
import { getClientFinancialElements } from "../selectors/client-financial.selector.js";
import { ClientFinancialManager } from "../ui/client-financial-manager.js";
import { AdminClientProposalsModule } from "./admin-client-proposals.module.js";
import { AdminHomeModule } from "./admin-home.module.js";
import { AdminClientsModule } from "./admin-clients.module.js";
import { AdminClientManagementModule } from "./admin-client-management.module.js";

export class AdminSystemModules {
    private base?: baseElements;
    private newClient?: newClientElements;
    private clientFinancialRequestId = 0;
    private readonly clientProposals: AdminClientProposalsModule;
    private readonly home: AdminHomeModule;
    private readonly clients: AdminClientsModule;
    private readonly clientManagement: AdminClientManagementModule;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly clientCreation: ClientCreationFlow,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void
    ) {
        this.clientProposals = new AdminClientProposalsModule(
            view,
            models,
            api,
            session,
            navigate,
            () => this.base?.desktop_nav_client
        );
        this.home = new AdminHomeModule(
            view,
            models.home!,
            () => navigate("clients"),
            () => this.base?.desktop_nav_home
        );
        this.clients = new AdminClientsModule(
            view,
            models.client!,
            api,
            session,
            () => navigate("new-client"),
            clientId => navigate("client-management", clientId),
            () => this.base?.desktop_nav_client
        );
        this.clientManagement = new AdminClientManagementModule(
            view,
            models.clientManagement!,
            api,
            session,
            () => navigate("clients"),
            clientId => navigate("client-proposals", clientId),
            clientId => navigate("client-financial", clientId),
            () => this.base?.desktop_nav_client
        );
    }

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.mountBase(); break;
            case "home": this.home.mount(); break;
            case "clients": this.clients.mount(); break;
            case "client-management": void this.clientManagement.mount(id); break;
            case "client-proposals": void this.clientProposals.mount(id); break;
            case "client-financial": void this.mountClientFinancial(id); break;
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
        this.mountMobileNavigation();
        u(this.base.desktop_nav_home).off("click").on("click", () => this.navigate("home"));
        u(this.base.desktop_nav_client).off("click").on("click", () => this.navigate("clients"));
        u(this.base.desktop_logout).off("click").on("click", () => {
            void logoutSession("admin", this.session.token);
        });
    }

    private mountMobileNavigation(): void {
        const expandButton = this.base?.mobile_expand_button;
        const navigationContainer = document.querySelector<HTMLElement>(".navigation-container");
        const desktopNavigation = document.querySelector<HTMLElement>(".desktop-navigation");
        const desktopLogout = document.querySelector<HTMLElement>(".logout-desktop");
        if (!expandButton || !navigationContainer || !desktopNavigation || !desktopLogout) return;

        const menu = document.createElement("div");
        menu.id = "admin-mobile-navigation";
        menu.className = "mobile-navigation-menu";
        menu.setAttribute("aria-hidden", "true");
        const navigation = document.createElement("ul");
        navigation.className = "mobile-navigation";
        const desktopItems = Array.from(
            desktopNavigation.querySelectorAll<HTMLElement>(".desktop-navigation-item")
        );
        const mobileItems = desktopItems.map(desktopItem => {
            const item = desktopItem.cloneNode(true) as HTMLElement;
            item.classList.remove("desktop-navigation-item", "desktop-nav-item-selected");
            item.classList.add("mobile-navigation-item");
            item.querySelector(".desktop-navigation-item-icon")
                ?.classList.replace("desktop-navigation-item-icon", "mobile-navigation-item-icon");
            item.querySelector(".desktop-navigation-item-label")
                ?.classList.replace("desktop-navigation-item-label", "mobile-navigation-item-label");
            navigation.append(item);
            return item;
        });
        const logout = desktopLogout.cloneNode(true) as HTMLElement;
        logout.className = "logout-mobile";
        menu.append(navigation, logout);
        navigationContainer.append(menu);

        expandButton.setAttribute("role", "button");
        expandButton.tabIndex = 0;
        expandButton.setAttribute("aria-controls", menu.id);
        expandButton.setAttribute("aria-expanded", "false");
        expandButton.setAttribute("aria-label", "Abrir menu de navegação");

        const syncSelection = (): void => {
            mobileItems.forEach((item, index) => {
                item.classList.toggle(
                    "mobile-nav-item-selected",
                    desktopItems[index]?.classList.contains("desktop-nav-item-selected") ?? false
                );
            });
        };
        const closeMenu = (): void => {
            menu.classList.remove("mobile-navigation-menu-open");
            menu.setAttribute("aria-hidden", "true");
            expandButton.setAttribute("aria-expanded", "false");
            expandButton.setAttribute("aria-label", "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace("fa-times", "fa-bars");
        };
        const toggleMenu = (): void => {
            const willOpen = !menu.classList.contains("mobile-navigation-menu-open");
            if (willOpen) syncSelection();
            menu.classList.toggle("mobile-navigation-menu-open", willOpen);
            menu.setAttribute("aria-hidden", String(!willOpen));
            expandButton.setAttribute("aria-expanded", String(willOpen));
            expandButton.setAttribute("aria-label", willOpen
                ? "Fechar menu de navegação"
                : "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace(
                willOpen ? "fa-bars" : "fa-times",
                willOpen ? "fa-times" : "fa-bars"
            );
        };

        expandButton.addEventListener("click", toggleMenu);
        expandButton.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggleMenu();
        });
        mobileItems.forEach((item, index) => {
            item.addEventListener("click", () => {
                desktopItems[index]?.click();
                syncSelection();
                closeMenu();
            });
        });
        logout.addEventListener("click", () => {
            desktopLogout.click();
            closeMenu();
        });

        const globalListeners = new AbortController();
        this.view.registerDisposer(() => globalListeners.abort(), "body");
        document.addEventListener("click", event => {
            const target = event.target as Node;
            if (!menu.contains(target) && !expandButton.contains(target)) closeMenu();
        }, { signal: globalListeners.signal });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu();
        }, { signal: globalListeners.signal });
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 900) closeMenu();
        }, { signal: globalListeners.signal });
        syncSelection();
    }

    private async mountClientFinancial(clientId?: string): Promise<void> {
        if (!clientId || !this.models.clientFinancial) {
            this.navigate("clients");
            return;
        }

        this.view.render(this.models.clientFinancial, ".page-content");
        const requestId = ++this.clientFinancialRequestId;
        let manager: ClientFinancialManager | undefined;
        this.view.registerDisposer(() => {
            this.clientFinancialRequestId += 1;
            manager?.dispose();
        });
        this.view.styleNavButton(this.base!.desktop_nav_client);
        const elements = getClientFinancialElements();
        u(elements.clientsIndex).off("click").on("click", () => this.navigate("clients"));
        u(elements.clientIndex).off("click").on("click", () => this.navigate("client-management", clientId));
        u(elements.back).off("click").on("click", () => this.navigate("client-management", clientId));

        try {
            const [client, paymentPage] = await Promise.all([
                this.api.loadClient(this.session, clientId),
                this.api.loadPayments(this.session, clientId)
            ]);
            if (requestId !== this.clientFinancialRequestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            manager = new ClientFinancialManager(elements, this.api, this.session, clientId, paymentPage);
        } catch (error) {
            if (requestId !== this.clientFinancialRequestId) return;
            console.error("Erro ao carregar financeiro do cliente:", error);
            this.navigate("clients");
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
