import { config } from "@/utils/connection.js";
import u from "umbrellajs";
import { getBaseElements } from "../selectors/base.selector.js";
import type { ClientElementCollection } from "../selectors/collection.js";
import getTemplates from "../templates/getter.js";
import type { system, DbView } from "../templates/interface.js";
import { ClientSystemView, type PageState } from "../views/clientSystem.view.js";

export default class ClientSystem {
    private view!: ClientSystemView;
    private models: system = {};
    private collection: ClientElementCollection = {};
    private readonly name: string;

    constructor(login: string, password: string, name: string, hasBriefing: boolean) {
        this.name = name;
        void this.initializeSystem(login, password, hasBriefing);
    }

    private async initializeSystem(login: string, password: string, hasBriefing: boolean): Promise<void> {
        const initialized = await this.getModels(login, password, hasBriefing);

        if (!initialized) {
            return;
        }

        window.addEventListener("popstate", (event: PopStateEvent) => {
            const state = event.state as PageState | null;

            if (state?.page && this.models[state.page]) {
                this.renderSection(state.page, { pushHistory: false });
            }
        });
    }

    private async getModels(login: string, password: string, hasBriefing: boolean): Promise<boolean> {
        const response = await fetch(`${config.apiBaseUrl}/view/client`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ login, password })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json() as { view: DbView[] };
        this.models = getTemplates(data.view, this.name);

        this.view = new ClientSystemView();
        if (hasBriefing){
            this.renderSection("base")
            this.renderSection("home")
        }else{
            this.renderSection("briefing")
        }


        return true;
    }

    private renderSection(page: string, options: { pushHistory?: boolean } = {}): void {
        const template = this.models[page];

        if (!template) {
            return;
        }
        switch (page) {
            case "briefing":
                
                break;
            case "base":
                this.view.render(this.models.base, "body");
                this.collection.baseElements = getBaseElements();
                break
            case "home":
                this.view.render(this.models.home, ".page-content")
                break;
        }

        this.addUserInteractions(page)

        if ((options.pushHistory ?? true) && this.shouldPushHistory(page)) {
            window.history.pushState({ page } satisfies PageState, "");
        }
    }

    private addUserInteractions(page: string) {
        switch (page) {
            case "base":
                u(this.collection.baseElements!.desktop_nav_home)
                    .off("click")
                    .on("click", () => {
                        this.renderSection("home")
                    })

                u(this.collection.baseElements!.desktop_nav_client)
                    .off("click")
                    .on("click", () => {
                        this.renderSection("clients")
                    })
                break;
        }
    }

    private shouldPushHistory(page: string): boolean {
        const currentState = window.history.state as PageState | null;
        return currentState?.page !== page;
    }
}
