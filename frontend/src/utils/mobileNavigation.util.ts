import AuthController from "../controllers/auth.controller.js"

export class mobileNavigation {
    static renderAuth: () => any
    static renderHome: () => any
    static renderCreateRoom: () => any
    static renderJoinRoom: () => any
    static isRenderingFromPopstate: boolean = false

    static initialize() {
        window.addEventListener("popstate", (event) => {
            if (event.state) {
                mobileNavigation.isRenderingFromPopstate = true
                mobileNavigation.popCurrent()
                mobileNavigation.renderTarget(event.state.tela)
                mobileNavigation.isRenderingFromPopstate = false
            }
            // console.log(event.state.tela)
        })
    }

    static popCurrent() {
        // todo: padronizar com selector
        var a = document.querySelector(".content")!.children[0] as HTMLElement
        a.remove()
    }

    static renderTarget(target: string) {
        if (target)
            switch (target) {
                case "auth":
                    // new AuthController
                    console.log("Render auth")
                    mobileNavigation.renderAuth()
                    break
                case "home":
                    // new homeController
                    console.log("Render home")
                    mobileNavigation.renderHome()
                    break
                case "createRoom":
                    // new CreateRoomController
                    console.log("Render CreateRoom")
                    mobileNavigation.renderCreateRoom()
                    break
                case "joinRoom":
                    // new CreateRoomController
                    console.log("Render JoinRoom")
                    mobileNavigation.renderJoinRoom()
                    break


            }
    }
}