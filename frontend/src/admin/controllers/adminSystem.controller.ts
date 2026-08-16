import { config } from "@/utils/connection.js"
import getTemplates from "../templates/getter.js";
import AdminSystemView from "../views/adminSystem.view.js";
import { system } from "../templates/interface.js";

export default class AdminSystem {

    view!: AdminSystemView
    elements!: system;
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

            this.elements = getTemplates(dbModels, this.name)

            this.view = new AdminSystemView()
            // console.log(this.elements)
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
                    this.elements.base,
                    "body"
                )

            case "home":
                this.view.render(
                    this.elements.home,
                    ".page-content"
                )
                break;
            case "client":
                this.view.render(
                    this.elements.client,
                    ".page-content"
                )
                break;
        }
    }
}