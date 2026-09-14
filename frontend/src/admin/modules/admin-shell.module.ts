import u from "umbrellajs";
import { logoutSession } from "@/shared/session/logout.js";
import type { AdminSession } from "../infrastructure/admin-system.api.js";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";

export class AdminShellModule {
    private elements?: baseElements;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly session: AdminSession,
        private readonly navigateToHome: () => void,
        private readonly navigateToClients: () => void
    ) { }

    mount(): void {
        this.view.render(this.template, "body");
        this.elements = getBaseElements();
        this.mountMobileNavigation(this.elements);
        u(this.elements.desktop_nav_home).off("click").on("click", this.navigateToHome);
        u(this.elements.desktop_nav_client).off("click").on("click", this.navigateToClients);
        u(this.elements.desktop_logout).off("click").on("click", () => {
            void logoutSession("admin", this.session.token);
        });
    }

    get homeNavigation(): HTMLElement | undefined {
        return this.elements?.desktop_nav_home;
    }

    get clientsNavigation(): HTMLElement | undefined {
        return this.elements?.desktop_nav_client;
    }

    private mountMobileNavigation(elements: baseElements): void {
        const expandButton = elements.mobile_expand_button;
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
        closeMenu();
        syncSelection();
    }
}
