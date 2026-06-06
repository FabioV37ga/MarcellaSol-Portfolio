import CreateRoomView from "../views/createRoom.view.js";
import { mobileNavigation } from "../utils/mobileNavigation.util.js";
import { getElements, createRoomElements, getConfirmedWords } from "../selectors/createRoom.selector.js";
import u from "umbrellajs"
import ClientController from "./client.controller.js";

class CreateRoomController {
    view: CreateRoomView
    callback: ()=> void
    elements: createRoomElements

    constructor(callback: () => void) {
        if (!mobileNavigation.isRenderingFromPopstate) {
            history.pushState({tela: "createRoom"}, '', '')
        }

        this.view = new CreateRoomView()

        this.elements = getElements()
        this.addClickEvents()
        this.callback = callback
    }

    addClickEvents(){

        // Adicionar palavras aleatoriamente
        u(this.elements.random).on("click", ()=>{
            this.view.randomizeWords()
        })

        // Adicionar palavras manualmente
        u(this.elements.wordInput).on("input", (e: any) => {
            const event = e as InputEvent
            
            if(event.data === ','){
                this.view.setWord(this.elements.wordInput)
            }
        })

        // Confirmar criação de sala
        u(this.elements.confirm).on("click", ()=>{
            var confirmedWords: string[] | false = this.returnConfirmedWords()

            if (confirmedWords != false)
                ClientController.createLobby(confirmedWords)
            else{
                console.log("Erro na criação: Palavras insuficientes.")
            }

        })

        // Botão voltar
        u(this.elements.close).on("click", ()=>{
            this.return()
        })

        
    }

    returnConfirmedWords(): string[] | false{
        var confirmedWordElements = getConfirmedWords()
        var confirmedWordList: string[] = []

        confirmedWordElements.forEach(element => {
            confirmedWordList.push(element.textContent.trim())
        });

        if (confirmedWordList.length < 1)
            return false

        return confirmedWordList
    }

    return(){
        this.view.remove(this.elements.window)
        this.callback()
    }
}

export default CreateRoomController