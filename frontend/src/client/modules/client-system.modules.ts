import html from "nanohtml";
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
        switch (route) {
            case "wip":
                this.mountWorkInProgress();
                break;
            case "base":
                this.mountBase();
                break;
            case "home":
                this.view.render(this.models.home, ".page-content");
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "clients":
                break;
        }
    }

    private mountWorkInProgress(): void {
        const page: HTMLElement = html`
            <div>Bem vindo à area do cliente. Ainda estamos desenvolvendo sua experiência. Se você chegou até aqui, seu briefing foi preenchido com sucesso. :)</div>
        `;
        this.view.render(page, "body");
    }

    private mountBase(): void {
        this.view.render(this.models.base, "body");
        this.baseElements = getBaseElements();

        u(this.baseElements.desktop_nav_home)
            .off("click")
            .on("click", () => this.navigate("home"));
        u(this.baseElements.desktop_nav_client)
            .off("click")
            .on("click", () => this.navigate("clients"));
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
