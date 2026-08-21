import u from "umbrellajs";


export class AdminSystemView {
    constructor() {
        // console.log("Admin System View initialized.")

        this.dismissLogin()
        // this.render(home)
    }

    dismissLogin() {
        var login = u(".admin-login").first() as HTMLElement
        login.remove()
    }

    render(section: HTMLElement, target: string) {
        const container = u(target).first() as HTMLElement

        if (target != "body")
            this.unrender()

        container.append(section)
    }

    unrender() {
        // console.log("attempting to unrender")
        const container = u(".page-content").first() as HTMLElement
        if (container.childElementCount > 0) {
            const containerChildren = container.children
            for (let childIndex = 0; childIndex <= containerChildren.length - 1; childIndex++) {
                containerChildren[childIndex].remove()

            }
        }
    }

    styleNavButton(button: HTMLElement){
        // console.log("style")
        const selected = u(".desktop-nav-item-selected").first() as HTMLElement
        u(selected).removeClass("desktop-nav-item-selected")
        // console.log(selected)

        // console.log(button)
        u(button).addClass("desktop-nav-item-selected")
    }
}
