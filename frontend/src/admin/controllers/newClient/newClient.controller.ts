import type { BriefingDefinition, NewClientPayload } from "@/shared/briefing/briefing.types.js";
import { Briefing } from "./briefing.controller.js";

export type client = NewClientPayload;

export class newClient{
    private sessionToken: string
    private name: string;
    private login: string;
    private password: string;
    briefing?: BriefingDefinition;
    private briefingController!: Briefing

    constructor(name: string, login: string, password: string, sessionToken: string){
        this.name = name;
        this.login = login;
        this.password = password
        this.briefingController = new Briefing()
        this.sessionToken = sessionToken
    }

    async getModels(){
        return await this.briefingController.getModels(this.name, this.sessionToken)!
    }
    
    addUserInteractions(page: string, callback: any){
        console.log("we are here - new client bi")
        console.log(page)
        this.briefingController.addUserInteractions(page, callback)
    }

    returnClientObject():client{
        return{
            _id: '',
            login: this.login,
            password: this.password,
            name: this.name,
            hasFilledBriefing: false,
            briefing: this.briefingController.getBriefingObject()
        }
    }
}
