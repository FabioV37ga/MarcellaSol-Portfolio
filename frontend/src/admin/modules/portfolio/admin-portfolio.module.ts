import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import "../../styles/system/portfolio.css";

export class AdminPortfolioModule {
    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly portfolioNavigation: () => HTMLElement | undefined
    ) { }

    mount(): void {
        this.view.render(this.template, ".page-content");
        const navigation = this.portfolioNavigation();
        if (navigation) this.view.styleNavButton(navigation);
    }
}
