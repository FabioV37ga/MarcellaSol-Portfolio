import u from "umbrellajs";
import ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";

export class ClientSystemModules {
    private baseElements?: baseElements;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly briefing: ClientBriefingController,
        private readonly navigate: (route: ClientRoute) => void
    ) {}

    mount(route: ClientRoute, briefingStep?: number): void {
        document.body.classList.toggle("client-briefing-active", route === "briefing");
        switch (route) {
            case "base":
                this.mountBase();
                break;
            case "home":
                this.view.render(this.models.home, ".page-content");
                this.view.styleNavButton(this.baseElements?.desktop_nav_home);
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "clients":
                break;
        }
    }

    private mountBase(): void {
        this.view.render(this.models.base, "body");
        this.baseElements = getBaseElements();
        this.mountMobileNavigation();
        this.view.styleNavButton(this.baseElements.desktop_nav_home);

        u(this.baseElements.desktop_nav_home)
            .off("click")
            .on("click", () => this.navigate("home"));
        u(this.baseElements.desktop_nav_client)
            .off("click")
            .on("click", () => this.navigate("clients"));
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
