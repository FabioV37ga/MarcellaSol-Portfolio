import u from "umbrellajs";
import { system } from "../templates/interface.js";

export default class AdminSystemView{
    constructor(){
        console.log("Admin System View initialized.")

        this.dismissLogin()
        // this.render(home)
    }

    dismissLogin(){
        var login = u(".admin-login").first() as HTMLElement
        login.remove()
    }

    render(section: HTMLElement, target: string){

        const container = u(target).first() as HTMLElement
        container.append(section)
    }
}