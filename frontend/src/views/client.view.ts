import { getElements, clientElements } from "../selectors/client.selector.js"

class ClientView {
    elements: clientElements

    constructor() {
        this.elements = getElements()
    }

    toggleLoadingScreen(show: boolean) {
        if (show) {
            this.elements.loading.style.display = "flex"
        } else {
            this.elements.loading.style.display = "none"
        }
    }

    showLogo() {
        this.elements.logo.style.display = "initial"
        this.elements.logo.classList.add("loaded")
    }
}

export default ClientView