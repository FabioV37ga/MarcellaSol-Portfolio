import { briefingHome, getBriefingHome } from "@/admin/selectors/newClient/briefing.selector.js";
import getTemplates from "@/admin/templates/getter.js";
import { DbView } from "@/client/templates/interface.js";
import { config } from "@/utils/connection.js";
import u from "umbrellajs";

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
    private home!: briefingHome
    // private models: ;

    constructor() {
        // this.getModels("","")
    }

    async getModels(login: string, password: string, name: string, adminLogin: string, adminPassword: string) {
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

    addUserInteractions(page: string, callback: any) {
        this.home = getBriefingHome();
        switch (page) {
            case "home":

                var clientsRoot = u(this.home.root).nodes[0] as HTMLElement
                u(clientsRoot)
                    .off("click")
                    .on("click", () => {
                        callback("clients")
                    })

                var newClientRoot = u(this.home.root).nodes[1] as HTMLElement
                u(newClientRoot)
                    .off("click")
                    .on("click", ()=>{
                        callback("new-client")
                    })

                u(this.home.confirm)
                    .off("click")
                    .on("click", ()=>{
                        this.checkFields(page) ? callback("briefing-rooms") : null
                    })

                break
        }
    }

    protected checkFields(page: string):boolean{
        switch(page){
            case "home":
                if (
                    this.home.category.value &&
                    this.home.type.value &&
                    this.home.name.value &&
                    this.home.peopleAmount.value
                ){
                    return true
                }else{
                    return false
                }
                
        }
        return false
    }

}
