import JoinRoomView from "../views/joinRoom.view.js";
import { mobileNavigation } from "../utils/mobileNavigation.util.js";
import { getElements, JoinRoomElements } from "../selectors/joinRoom.selector.js";
import u from "umbrellajs"
import ClientController from "./client.controller.js";
import LobbyController from "./lobby.controller.js";
import AuthController from "./auth.controller.js";

class JoinRoomController {
    view: JoinRoomView
    callback: ()=> void
    elements: JoinRoomElements
    codeTypeInterval: any

    constructor(callback: () => void) {
        
        if (!mobileNavigation.isRenderingFromPopstate) {
            history.pushState({tela: "joinRoom"}, '', '')
        }
        
        this.view = new JoinRoomView()
        
        this.elements = getElements()

        this.addClickEvents()
        this.callback = callback
    }

    addClickEvents(){
        u(this.elements.confirm).on("click", ()=>{
            var inviteCode = this.elements.code.value.toLowerCase()
            ClientController.joinLobby(inviteCode)
        })

        u(this.elements.close).on("click", ()=>{
            this.return()
            console.log("click on close")
        })
    }

    return(){
        this.view.remove(this.elements.window)
        this.callback()
    }
}

export default JoinRoomController