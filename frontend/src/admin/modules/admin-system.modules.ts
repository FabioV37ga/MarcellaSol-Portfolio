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
import { logoutSession } from "@/shared/session/logout.js";
import { getClientFinancialElements } from "../selectors/client-financial.selector.js";
import { ClientFinancialManager } from "../ui/client-financial-manager.js";
import { AdminClientProposalsModule } from "./admin-client-proposals.module.js";

export class AdminSystemModules {
    private base?: baseElements;
    private home?: homeElements;
    private clients?: clientsElements;
    private newClient?: newClientElements;
    private clientManagementRequestId = 0;
    private clientFinancialRequestId = 0;
    private readonly clientProposals: AdminClientProposalsModule;

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
    }

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.mountBase(); break;
            case "home": this.mountHome(); break;
            case "clients": this.mountClients(); break;
            case "client-management": void this.mountClientManagement(id); break;
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

            let deletingClient: typeof clients[number] | undefined;
            let deleting = false;
            const syncDeleteConfirmation = (): void => {
                this.clients!.deleteConfirm.disabled = !deletingClient
                    || this.clients!.deleteConfirmation.value !== deletingClient.name;
            };
            const openDeleteDialog = (client: typeof clients[number]): void => {
                deletingClient = client;
                this.clients!.deleteName.textContent = client.name;
                this.clients!.deleteConfirmation.value = "";
                this.clients!.deleteFeedback.textContent = "";
                syncDeleteConfirmation();
                this.clients!.deleteDialog.showModal();
                this.clients!.deleteConfirmation.focus();
            };
            const resetDeleteDialog = (): void => {
                deletingClient = undefined;
                this.clients!.deleteForm.reset();
                this.clients!.deleteName.textContent = "";
                this.clients!.deleteFeedback.textContent = "";
                this.clients!.deleteConfirm.disabled = true;
            };

            this.clients.deleteConfirmation.oninput = syncDeleteConfirmation;
            this.clients.deleteCancel.onclick = () => this.clients?.deleteDialog.close();
            this.clients.deleteDialog.oncancel = event => {
                if (deleting) event.preventDefault();
            };
            this.clients.deleteDialog.onclose = resetDeleteDialog;
            this.clients.deleteForm.onsubmit = event => {
                event.preventDefault();
                const client = deletingClient;
                if (!client || this.clients!.deleteConfirmation.value !== client.name) {
                    this.clients!.deleteFeedback.textContent = "Digite o nome exatamente como apresentado.";
                    syncDeleteConfirmation();
                    return;
                }

                deleting = true;
                this.clients!.deleteConfirm.disabled = true;
                this.clients!.deleteCancel.disabled = true;
                this.clients!.deleteConfirmation.disabled = true;
                this.clients!.deleteFeedback.textContent = "Apagando cliente...";
                void this.api.deleteClient(this.session, client.id, this.clients!.deleteConfirmation.value).then(() => {
                    this.clients?.list.querySelector<HTMLElement>(`[data-client-id="${CSS.escape(client.id)}"]`)?.remove();
                    this.clients?.deleteDialog.close();
                }, error => {
                    this.clients!.deleteFeedback.textContent = error instanceof Error
                        ? error.message : "Não foi possível apagar o cliente.";
                }).then(() => {
                    deleting = false;
                    if (!this.clients) return;
                    this.clients.deleteCancel.disabled = false;
                    this.clients.deleteConfirmation.disabled = false;
                    syncDeleteConfirmation();
                });
            };

            this.clients.list
                .querySelectorAll(":scope > .client-list-client")
                .forEach(item => item.remove());

            const items = document.createDocumentFragment();
            clients.forEach(client => {
                const item = clientListItem(client, this.clients!.itemTemplate);
                u(item).on("click", () => this.navigate("client-management", client.id));
                item.addEventListener("keydown", event => {
                    if (event.target === item && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        this.navigate("client-management", client.id);
                    }
                });
                item.querySelector<HTMLButtonElement>(".client-delete")!.addEventListener("click", event => {
                    event.stopPropagation();
                    openDeleteDialog(client);
                });
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
        const requestId = ++this.clientManagementRequestId;
        this.view.registerDisposer(() => {
            this.clientManagementRequestId += 1;
        });
        this.view.styleNavButton(this.base!.desktop_nav_client);
        const elements = getClientManagementElements();
        elements.drive.removeAttribute("href");
        elements.drive.setAttribute("aria-disabled", "true");
        elements.drive.classList.add("client-management-action-disabled");
        elements.briefingReport.disabled = true;
        elements.briefingReport.classList.add("client-management-report-loading");
        elements.briefingReport.classList.remove("client-management-report-unavailable");
        elements.briefingReportLabel.textContent = "Verificando...";
        u(elements.briefingReport).off("click");
        elements.briefingReport.onclick = null;
        u(elements.clientsIndex).off("click").on("click", () => this.navigate("clients"));
        u(elements.back).off("click").on("click", () => this.navigate("clients"));
        u(elements.financial).off("click").on("click", () => this.navigate("client-financial", id));

        try {
            const client = await this.api.loadClient(this.session, id);
            if (requestId !== this.clientManagementRequestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            if (elements.proposals) {
                u(elements.proposals).off("click").on("click", () => this.navigate("client-proposals", id));
            }

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
                await this.mountBriefingReport(id, elements, requestId);
            } else {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.remove("client-management-report-loading");
                elements.briefingReport.classList.add("client-management-report-unavailable");
                elements.briefingReportLabel.textContent = "Cliente ainda não preencheu o briefing";
            }
        } catch (error) {
            if (requestId !== this.clientManagementRequestId) return;
            console.error("Erro ao carregar o cliente:", error);
            this.navigate("clients");
        }
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
            const [client, payments] = await Promise.all([
                this.api.loadClient(this.session, clientId),
                this.api.loadPayments(this.session, clientId)
            ]);
            if (requestId !== this.clientFinancialRequestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            manager = new ClientFinancialManager(elements, this.api, this.session, clientId, payments);
        } catch (error) {
            if (requestId !== this.clientFinancialRequestId) return;
            console.error("Erro ao carregar financeiro do cliente:", error);
            this.navigate("clients");
        }
    }

    private async mountBriefingReport(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>,
        requestId: number
    ): Promise<void> {
        try {
            const status = await this.api.loadBriefingReportStatus(this.session, clientId);
            if (requestId !== this.clientManagementRequestId) return;
            this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
        } catch (error) {
            if (requestId !== this.clientManagementRequestId) return;
            console.error("Erro ao verificar relatório do briefing:", error);
            elements.briefingReport.classList.remove("client-management-report-loading");
            elements.briefingReport.disabled = false;
            elements.briefingReportLabel.textContent = "Tentar novamente";
            elements.briefingReport.onclick = () => {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.add("client-management-report-loading");
                elements.briefingReportLabel.textContent = "Verificando...";
                void this.mountBriefingReport(clientId, elements, requestId);
            };
        }
    }

    private bindBriefingReportAction(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>,
        exists: boolean,
        folderUrl: string | undefined,
        requestId: number
    ): void {
        const button = elements.briefingReport;
        button.disabled = false;
        button.classList.remove("client-management-report-loading");
        button.classList.remove("client-management-report-unavailable");
        u(button).off("click");
        button.onclick = null;

        if (exists && folderUrl) {
            elements.briefingReportLabel.textContent = "Acessar";
            button.onclick = () => {
                window.open(folderUrl, "_blank", "noopener,noreferrer");
            };
            return;
        }

        elements.briefingReportLabel.textContent = "Gerar relatório";
        button.onclick = () => {
            button.disabled = true;
            button.classList.add("client-management-report-loading");
            elements.briefingReportLabel.textContent = "Gerando relatório...";
            void this.api.generateBriefingReport(this.session, clientId)
                .then(status => {
                    if (requestId !== this.clientManagementRequestId) return;
                    this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
                })
                .catch(error => {
                    if (requestId !== this.clientManagementRequestId) return;
                    console.error("Erro ao gerar relatório do briefing:", error);
                    button.disabled = false;
                    button.classList.remove("client-management-report-loading");
                    elements.briefingReportLabel.textContent = "Tentar novamente";
                });
        };
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
