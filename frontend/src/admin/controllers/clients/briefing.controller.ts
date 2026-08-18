import getTemplates from "@/admin/templates/getter.js";
import { DbView } from "@/client/templates/interface.js";
import { config } from "@/utils/connection.js";

export interface briefing {
    id?: string;
    user: {
        name: string
    };
    description: {
        type: string;
        name: string;
    };
    residentAmount: number;
    rooms: room[]
}

interface room {
    id: number;
    index: number;
    name: string;
    options?: boolean[]
}

export class Briefing {
    private currentPage = 0;
    // private models: ;

    constructor() {
        // this.getModels("","")
    }

    async getModels(login: string, password: string, name: string, adminLogin:string, adminPassword: string) {
        console.log(login, password)
        const response = await fetch(`${config.apiBaseUrl}/view/admin/briefing`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login: adminLogin,
                password: adminPassword
            })
        })

        var data = await response.json()

        return getTemplates("briefing", data.views, name)
    }


}
