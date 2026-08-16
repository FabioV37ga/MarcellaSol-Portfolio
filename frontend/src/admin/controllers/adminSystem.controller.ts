import { config } from "@/utils/connection.js"
import getTemplates from "../templates/getter.js";
import AdminSystemView from "../views/adminSystem.view.js";
import { system } from "../templates/interface.js";
import collection from "../selectors/collection.js";
import { getBaseElements } from "../selectors/base.selector.js";
import { getHomeElements } from "../selectors/home.selector.ts.js";
import u from "umbrellajs";

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
        await this.getModels(user, password)
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
            this.renderSection("base")
            document.addEventListener("keydown", (e) => {
                if (e.key == 'w') {
                    this.renderSection("client")
                }
            })
        }
    }

    protected renderSection(page: string) {
        switch (page) {

            case "base":
                this.view.render(
                    this.models.base,
                    "body"
                )
                // refatorar p/ função com switch
                // console.log(this.collection)
                this.collection.baseElements = getBaseElements();

            case "home":
                this.view.render(
                    this.models.home,
                    ".page-content"
                )
                // refatorar p/ função com switch
                this.collection.homeElements = getHomeElements();
                // teste temporario
                u(this.collection.homeElements.access_client).on("click", ()=>{
                    console.log("Admin clicked in client, accessing.")
                    this.renderSection("client")
                })
                break;
            case "client":
                this.view.render(
                    this.models.client,
                    ".page-content"
                )
                break;
        }
    }
}