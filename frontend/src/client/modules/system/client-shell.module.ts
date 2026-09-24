import u from "umbrellajs";
import type { ClientRoute } from "../../navigation/client-system.router.js";
import { getBaseElements, type baseElements } from "../../selectors/base.selector.js";
import { logoutSession } from "@/shared/session/logout.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";

export class ClientShellModule {
    private elements?: baseElements;

    constructor(
        private readonly view: ClientSystemView,
        private readonly template: HTMLElement,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) { }

    mount(): void {
        this.view.render(this.template, "body");
        this.elements = getBaseElements();
        this.mountMobileNavigation(this.elements);
        this.view.styleNavButton(this.elements.desktop_nav_home);
        u(this.elements.desktop_logout).off("click").on("click", () => {
            void logoutSession("client", this.token);
        });
        u(this.elements.desktop_nav_home).off("click").on("click", () => this.navigate("home"));
        u(this.elements.desktop_nav_client).off("click").on("click", () => this.navigate("stages-approvals"));
        u(this.elements.desktop_nav_financial).off("click").on("click", () => this.navigate("financial"));
    }

    get baseElements(): baseElements | undefined {
        return this.elements;
    }

    get homeNavigation(): HTMLElement | undefined {
        return this.elements?.desktop_nav_home;
    }

    get stagesNavigation(): HTMLElement | undefined {
        return this.elements?.desktop_nav_client;
    }

    get financialNavigation(): HTMLElement | undefined {
        return this.elements?.desktop_nav_financial;
    }

    private mountMobileNavigation(elements: baseElements): void {
        const expandButton = elements.mobile_expand_button;
        const desktopNavigation = document.querySelector<HTMLElement>(".desktop-navigation");
        const menu = document.querySelector<HTMLElement>("#client-mobile-navigation");
        if (!expandButton || !desktopNavigation || !menu) return;
        const globalListeners = new AbortController();
        this.view.registerDisposer(() => globalListeners.abort(), "body");

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
        }, { signal: globalListeners.signal });
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu();
        }, { signal: globalListeners.signal });
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 900) closeMenu();
        }, { signal: globalListeners.signal });
    }
}
