import { Briefing, briefingObject } from "./briefing.controller.js";

interface client{
    _id?: string;
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    briefing: briefingObject
}

export class newClient{
    private adminLogin!:string
    private adminPassword!:string
    private name: string;
    private login: string;
    private password: string;
    private briefing?: briefingObject;
    private briefingController!: Briefing

    constructor(name: string, login: string, password: string, adminLogin: string, adminPassword: string){
        this.name = name;
        this.login = login;
        this.password = password
        this.briefingController = new Briefing()
        this.adminLogin = adminLogin
        this.adminPassword = adminPassword
    }

    async getModels(){
        return await this.briefingController.getModels(this.login,this.password, this.name, this.adminLogin, this.adminPassword)!
    }
    
    addUserInteractions(page: string, callback: any){
        console.log("we are here - new client bi")
        console.log(page)
        this.briefingController.addUserInteractions(page, callback)
    }
}