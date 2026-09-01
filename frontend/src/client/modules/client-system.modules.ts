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
        this.applyClientBaseLabels();
        this.baseElements = getBaseElements();
        this.view.styleNavButton(this.baseElements.desktop_nav_home);

        u(this.baseElements.desktop_nav_home)
            .off("click")
            .on("click", () => this.navigate("home"));
        u(this.baseElements.desktop_nav_client)
            .off("click")
            .on("click", () => this.navigate("clients"));
    }

    private applyClientBaseLabels(): void {
        const areaLabel = document.querySelector<HTMLElement>(".presentation-text p");
        if (areaLabel) areaLabel.textContent = "Área do cliente";

        const welcomeText = document.querySelector<HTMLElement>(".welcome-text p");
        if (welcomeText) welcomeText.textContent = "Bem-vindo(a) à sua área do cliente.";

        const navigationItems = document.querySelectorAll<HTMLElement>(".desktop-navigation-item");
        const clientAreaItem = navigationItems[2];
        const clientAreaLabel = clientAreaItem?.querySelector<HTMLElement>(".desktop-navigation-item-label span");
        const clientAreaIcon = clientAreaItem?.querySelector<HTMLElement>(".desktop-navigation-item-icon i");
        if (clientAreaLabel) clientAreaLabel.textContent = "Meu projeto";
        if (clientAreaIcon) {
            clientAreaIcon.classList.remove("fa-users");
            clientAreaIcon.classList.add("fa-folder-open-o");
        }
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
