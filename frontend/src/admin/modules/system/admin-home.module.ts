import u from "umbrellajs";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import { getHomeElements } from "@/admin/selectors/home.selector.js";

export class AdminHomeModule {
    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly navigateToClients: () => void,
        private readonly homeNavigation: () => HTMLElement | undefined
    ) { }

    mount(): void {
        this.view.render(this.template, ".page-content");
        const elements = getHomeElements();
        const navigation = this.homeNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        u(elements.access_client).off("click").on("click", this.navigateToClients);
    }
}
