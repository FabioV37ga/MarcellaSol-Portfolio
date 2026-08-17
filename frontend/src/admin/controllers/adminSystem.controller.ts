import { config } from "@/utils/connection.js"
import u from "umbrellajs";
import { AdminSystemView, PageState } from "../views/adminSystem.view.js";
import { system } from "../templates/interface.js";
import collection from "../selectors/collection.js";
import getTemplates from "../templates/getter.js";
import { getBaseElements } from "../selectors/base.selector.js";
import { getHomeElements } from "../selectors/home.selector.ts.js";
import { getClientsElements } from "../selectors/clients.selector.js";
import { getNewClientElements } from "../selectors/new-client.selector.js";

export default class AdminSystem {

    view!: AdminSystemView
    models!: system;
    collection: collection = {}
    name: string;

    constructor(user: string, password: string, name: string) {
        this.initializeSystem(user, password);
        this.name = name;
    }

    async initializeSystem(user: string, password: string) {
        await this.getModels(user, password);


        window.addEventListener("popstate", (event) => {
            const state = event.state as PageState | null;

            if (!state) {
                return null
            }

            state.id
                ?
                this.renderSection(state.page, state.id, { pushHistory: false })
                :
                this.renderSection(state.page, undefined, { pushHistory: false })
        })
    }

    private async getModels(user: string, password: string) {

        const requisition = await fetch(`${config.apiBaseUrl}/view/admin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login: user,
                password: password
            })
        });

        if (requisition.ok) {
            var dbModels = await requisition.json()

            dbModels = dbModels.view

            this.models = getTemplates(dbModels, this.name)

            this.view = new AdminSystemView()
            // console.log(this.models)
            this.renderSection("base", undefined, { pushHistory: false })
            this.renderSection("home")
        }
    }

    private shouldPushHistory(page: string, id?: number) {
        const currentState = window.history.state as PageState | null;

        if (!currentState) {
            return true;
        }

        return currentState.page !== page || currentState.id !== id;
    }

    protected renderSection(page: string, id?: number, options: { pushHistory?: boolean } = {}) {
        const shouldPushHistory = options.pushHistory ?? true;

        switch (page) {

            case "base":
                this.view.render(
                    this.models.base,
                    "body"
                )
                this.collection.baseElements = getBaseElements();
                break;

            case "home":
                this.view.render(
                    this.models.home,
                    ".page-content"
                )
                this.collection.homeElements = getHomeElements();
                this.view.styleNavButton(this.collection.baseElements!.desktop_nav_home)
                break;

            case "clients":
                this.view.render(
                    this.models.client,
                    ".page-content"
                )
                this.collection.clientsElements = getClientsElements();
                this.view.styleNavButton(this.collection.baseElements!.desktop_nav_client)
                break;
            case "new-client":
                this.view.render(
                    this.models.newClient,
                    ".page-content"
                )
                this.collection.newClientElements = getNewClientElements();
                // this.addUserInteractions(this.collection.)

                break;
        }

        this.addUserInteractions(page)

        if (shouldPushHistory && this.shouldPushHistory(page, id)) {
            this.setNavigationState(page, id)
        }
    }

    protected addUserInteractions(page: string) {
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
                break
            case "home":
                u(this.collection.homeElements!.access_client)
                    .off("click")
                    .on("click", () => {
                        this.renderSection("clients")

                    })
                break;
            case "clients":
                u(this.collection.clientsElements!.new_client)
                    .off("click")
                    .on("click", () => {
                        console.log("Clicked new client")
                        this.renderSection("new-client")
                    })

                break;
            case "new-client":
                u(this.collection.newClientElements!.cancel)
                    .off("click")
                    .on("click", () => {
                        this.renderSection("clients")
                    })
                u(this.collection.newClientElements!.root)
                    .off("click")
                    .on("click", () => {
                        this.renderSection("clients")
                    })
                break;
        }
    }

    protected setNavigationState(page: string, id?: number) {
        var state: PageState;

        if (id) {
            state = {
                page,
                id
            }

        } else {
            state = {
                page
            }
        }

        window.history.pushState(state, "")
    }
}