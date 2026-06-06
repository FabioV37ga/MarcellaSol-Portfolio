import { getElements, homeElements } from "../selectors/home.selector.js"
import home from "../templates/home.template.js"
import ui from "./ui.view.js"

class HomeView extends ui{
    elements: homeElements

    
    constructor(userData: {nickname: string, character: string}){
        super()

        this.render(home(userData))
        this.elements = getElements()
    }
}

export default HomeView