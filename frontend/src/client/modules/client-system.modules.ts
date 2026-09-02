import u from "umbrellajs";
import ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import { getHomeElements } from "../selectors/home.selector.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { ClientSystemApi } from "../infrastructure/client-system.api.js";
import { clientApprovalItem } from "../templates/client-approval-item.template.js";
import { getStagesApprovalsElements } from "../selectors/stages-approvals.selector.js";
import { logoutSession } from "@/shared/session/logout.js";

export class ClientSystemModules {
    private baseElements?: baseElements;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly briefing: ClientBriefingController,
        private readonly api: ClientSystemApi,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) {}

    mount(route: ClientRoute, briefingStep?: number): void {
        document.body.classList.toggle("client-briefing-active", route === "briefing");
        switch (route) {
            case "base":
                this.mountBase();
                break;
            case "home":
                this.mountHome();
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "stages-approvals":
                void this.mountStagesApprovals();
                break;
        }
    }

    private mountHome(): void {
        this.view.render(this.models.home, ".page-content");
        this.view.styleNavButton(this.baseElements?.desktop_nav_home);
        const home = getHomeElements();
        u(home.stagesProcesses)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
    }

    private mountBase(): void {
        this.view.render(this.models.base, "body");
        this.baseElements = getBaseElements();
        this.mountMobileNavigation();
        this.view.styleNavButton(this.baseElements.desktop_nav_home);
        u(this.baseElements.desktop_logout).off("click").on("click", () => {
            void logoutSession("client", this.token);
        });

        u(this.baseElements.desktop_nav_home)
            .off("click")
            .on("click", () => this.navigate("home"));
        u(this.baseElements.desktop_nav_client)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
    }

    private async mountStagesApprovals(): Promise<void> {
        const model = this.models["stages-approvals"];
        if (!model) {
            console.error('A view "stages-approvals" não foi encontrada para o cliente.');
            return;
        }

        this.view.render(model, ".page-content");
        this.view.styleNavButton(this.baseElements?.desktop_nav_client);
        const elements = getStagesApprovalsElements();
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        try {
            const proposals = await this.api.loadProposals(this.token);
            elements.list.replaceChildren();
            if (proposals.length === 0) {
                elements.loading.hidden = true;
                elements.empty.hidden = false;
                return;
            }
            elements.empty.hidden = true;
            const items = document.createDocumentFragment();
            proposals.forEach(proposal => items.append(clientApprovalItem(proposal)));
            elements.list.append(items);
        } catch (error) {
            elements.loading.hidden = true;
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar as aprovações.";
            return;
        }

        elements.loading.hidden = true;
    }

    private mountMobileNavigation(): void {
        const expandButton = this.baseElements?.mobile_expand_button;
        const desktopNavigation = document.querySelector<HTMLElement>(".desktop-navigation");
        const menu = document.querySelector<HTMLElement>("#client-mobile-navigation");
        if (!expandButton || !desktopNavigation || !menu) return;

        const closeMenu = (): void => {
            menu.classList.remove("mobile-navigation-menu-open");
            menu.setAttribute("aria-hidden", "true");
            expandButton.setAttribute("aria-expanded", "false");
            expandButton.setAttribute("aria-label", "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace("fa-times", "fa-bars");
        };

        const toggleMenu = (): void => {
            const willOpen = !menu.classList.contains("mobile-navigation-menu-open");
            menu.classList.toggle("mobile-navigation-menu-open", willOpen);
            menu.setAttribute("aria-hidden", String(!willOpen));
            expandButton.setAttribute("aria-expanded", String(willOpen));
            expandButton.setAttribute("aria-label", willOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
            expandButton.querySelector("i")?.classList.replace(
                willOpen ? "fa-bars" : "fa-times",
                willOpen ? "fa-times" : "fa-bars"
            );
        };

        expandButton.addEventListener("click", toggleMenu);
        expandButton.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggleMenu();
        });

        const desktopItems = Array.from(desktopNavigation.querySelectorAll<HTMLElement>(".desktop-navigation-item"));
        const mobileItems = Array.from(menu.querySelectorAll<HTMLElement>(".mobile-navigation-item"));
        mobileItems.forEach((item, index) => {
            item.addEventListener("click", () => {
                desktopItems[index]?.click();
                mobileItems.forEach(mobileItem => mobileItem.classList.remove("mobile-nav-item-selected"));
                item.classList.add("mobile-nav-item-selected");
                closeMenu();
            });
        });

        const desktopLogout = document.querySelector<HTMLElement>(".logout-desktop");
        menu.querySelector<HTMLElement>(".logout-mobile")?.addEventListener("click", () => {
            desktopLogout?.click();
            closeMenu();
        });

        document.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menu.contains(target) && !expandButton.contains(target)) closeMenu();
        });
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu();
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 900) closeMenu();
        });
    }

    private mountBriefing(step?: number): void {
        const template = this.briefing.getTemplate();
        if (!template.isConnected) {
            this.view.render(template, "body");
            this.briefing.initialize();
        }
        if (Number.isInteger(step)) this.briefing.navigateToStep(step!);
    }
}
