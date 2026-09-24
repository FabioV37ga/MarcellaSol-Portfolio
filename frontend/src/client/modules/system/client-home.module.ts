import u from "umbrellajs";
import type { ClientRoute } from "../../navigation/client-system.router.js";
import { getHomeElements } from "../../selectors/home.selector.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";

export class ClientHomeModule {
    constructor(
        private readonly view: ClientSystemView,
        private readonly template: HTMLElement,
        private readonly navigate: (route: ClientRoute) => void
    ) { }

    mount(navigationButton?: HTMLElement): void {
        this.view.render(this.template, ".page-content");
        this.view.styleNavButton(navigationButton);
        const elements = getHomeElements();
        u(elements.stagesProcesses)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
        u(elements.financial)
            .off("click")
            .on("click", () => this.navigate("financial"));
    }
}
