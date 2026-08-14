import u from "umbrellajs";
import { system } from "../templates/interface.js";

export default class AdminSystemView{
    constructor(home: HTMLElement){
        console.log("Admin System View initialized.")

        this.dismissLogin()
        this.render(home)
    }

    dismissLogin(){
        var login = u(".admin-login").first() as HTMLElement
        login.remove()
    }

    render(section: HTMLElement){
        var container = u("body").first() as HTMLElement
        container.append(section)
    }
}