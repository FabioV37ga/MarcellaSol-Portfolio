import u from "umbrellajs";
import ui from "./ui.view.js";
import { charPointer, auth } from "../templates/auth.template.js";
import { getElements, authElements } from "../selectors/auth.selector.js";

class AuthView extends ui{
    elements: authElements

    constructor(){
        super()
        this.render(auth())
        this.elements = getElements()
    }


    fillFormWithCache(cache: {nickname: string, character: string}){

        var nicknameInput = this.elements.nicknameInput as HTMLInputElement
        nicknameInput.value = cache.nickname

        this.selectCharacter(cache.character)
        
    }

    selectCharacter(character: string){
        var pointer = u(`.charPointer`).first() as HTMLElement

        pointer.remove()
        
        var selectedCharacter = u(`.${character}`).first() as HTMLElement

        selectedCharacter.append(charPointer())

        var charImages = u(".charSelected").nodes as HTMLImageElement[]

        charImages.forEach((img) => {
            img.classList.remove("charSelected")
        })

        var selectedImage = u(selectedCharacter).find("img").first() as HTMLImageElement

        selectedImage.classList.add("charSelected")
    }

}

export default AuthView