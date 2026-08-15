import { config } from "@/utils/connection.js"
import getTemplates from "../templates/getter.js";
import AdminSystemView from "../views/adminSystem.view.js";
import { system } from "../templates/interface.js";

export default class AdminSystem {

    view!: AdminSystemView
    elements!: system

    constructor(user: string, password: string) {
        this.initializeSystem(user, password);

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

            this.elements = getTemplates(dbModels)

            this.view = new AdminSystemView()
            this.renderSection("home")
            // this.view.render(this.elements.test)

        }
    }

    protected renderSection(page: string) {
        switch (page){
            case "home":
                this.view.render(
                    this.elements.home,
                    "body"
                )

                console.log(this.elements.home)
                break;
        }
    }
}