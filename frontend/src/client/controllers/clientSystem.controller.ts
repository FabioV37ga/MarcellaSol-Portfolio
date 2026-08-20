import { config } from "@/utils/connection.js";
import u from "umbrellajs";
import { getBaseElements } from "../selectors/base.selector.js";
import type { ClientElementCollection } from "../selectors/collection.js";
import getTemplates from "../templates/getter.js";
import type { system, DbView } from "../templates/interface.js";
import { ClientSystemView, type PageState } from "../views/clientSystem.view.js";
import ClientBriefingController, {
    normalizeBriefingData,
    type ClientBriefingResponse
} from "./briefing.controller.js";``

import html from 'nanohtml'

export default class ClientSystem {
    private view!: ClientSystemView;
    private models: system = {};
    private collection: ClientElementCollection = {};
    private readonly name: string;
    private briefingController?: ClientBriefingController;

    constructor(login: string, password: string, name: string, hasFilledBriefing: boolean) {
        this.name = name;
        void this.initializeSystem(login, password, hasFilledBriefing);
    }

    private async initializeSystem(login: string, password: string, hasFilledBriefing: boolean): Promise<void> {
        const initialized = await this.getModels(login, password, hasFilledBriefing);

        if (!initialized) {
            return;
        }

        window.addEventListener("popstate", (event: PopStateEvent) => {
            const state = event.state as PageState | null;

            if (state?.page === "briefing" && Number.isInteger(state.briefingStep)) {
                if (!this.models.briefing.isConnected) {
                    this.renderSection("briefing", { pushHistory: false });
                }

                this.briefingController?.navigateToStep(state.briefingStep!);
                return;
            }

            if (state?.page && this.models[state.page]) {
                this.renderSection(state.page, { pushHistory: false });
            }
        });
    }

    private async getModels(login: string, password: string, hasFilledBriefing: boolean): Promise<boolean> {
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

        const data = await response.json() as { view: DbView[] } & ClientBriefingResponse;
        this.models = getTemplates(data.view, this.name);

        const normalizedData = normalizeBriefingData(data, this.name);
        this.briefingController = new ClientBriefingController(
            normalizedData.clientObject,
            normalizedData.briefingObject,
            { login, password }
        );
        this.models.briefing = this.briefingController.getTemplate();

        this.view = new ClientSystemView();
        if (normalizedData.clientObject.hasFilledBriefing || hasFilledBriefing){
            // this.renderSection("base")
            // this.renderSection("home")
            this.renderSection("wip")
        }else{
            this.renderSection("briefing")
        }


        return true;
    }

    private renderSection(page: string, options: { pushHistory?: boolean } = {}): void {

        switch (page) {
            case "wip":
                const workInProgress: HTMLElement = html`<div>Bem vindo à area do cliente. Ainda estamos desenvolvendo sua experiência. Se você chegou até aqui, seu briefing foi preenchido com sucesso. :)</div>`
                this.view.render(workInProgress, "body")
                break;
            case "base":
                this.view.render(this.models.base, "body");
                this.collection.baseElements = getBaseElements();
                break
            case "home":
                this.view.render(this.models.home, ".page-content")
                break;
            case "briefing":
                this.view.render(this.models.briefing, "body")
                this.briefingController?.initialize();
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
