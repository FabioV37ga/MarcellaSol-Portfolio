import { Socket, io } from "socket.io-client";
import { getElements, clientElements } from "../selectors/client.selector.js"
import ClientView from "../views/client.view.js";
import AuthController from "./auth.controller.js";
import HomeController from "./home.controller.js";
// import { assets } from "../utils/assetList.util.js";
import { preloadAssets } from "../utils/preloadAssets.js";
import { mobileNavigation } from "../utils/mobileNavigation.util.js";
import LobbyController from "./lobby.controller.js";
import { lobby } from "../models/lobby.model.js";

class ClientController {
    static socket: Socket
    static elements: clientElements
    static view = new ClientView()
    static currentPage: "auth" | "home" | "creating" | "joining" | "lobby" | "game" = "auth"
    static createLobbyDelay: Boolean = false;
    static areAssetsLoaded: Boolean = false;
    static isFirstAccess: boolean = true;
    static authScreen: AuthController;
    static homeScreen: HomeController

    static temp: string


    static async connect() {


        // -----------------
        // Controle de conexão baseado na URL, para facilitar desenvolvimento e deploy

        const url = window.location.href

        const URL_MAP: Record<string, string> = {
            localhost: "http://localhost:3001",
            "192.168.15.1": "http://192.168.15.1:3001",
            "192.168.15.2": "http://192.168.15.2:3001",
            "onrender.com": "https://impostor-game-k9kg.onrender.com/"
        }

        function getSocketUrl(url: string): string {
            const { protocol, hostname } = window.location

            const match = Object.entries(URL_MAP).find(([key]) => hostname.includes(key))

            return match ? match[1] : `${protocol}//${hostname}:3001`
        }

        ClientController.socket = io(getSocketUrl(url))

        ClientController.handleSocketEvents()
    }

    static handleSocketEvents() {



        // Erro de conexão
        ClientController.socket.on("connect_error", (err) => {
            console.log("[front] (client-connection) conexão ao socket falhou, aguardando...")

            ClientController.view.toggleLoadingScreen(true)
            return err;
        })



        // Conexão estabelecida (primeira vez)
        ClientController.socket.once("connect", async () => {
            console.log("[front] (client-connection) jogador conectado:", ClientController.socket.id)

            ClientController.areAssetsLoaded = await preloadAssets(() => this.view.showLogo())

            setTimeout(() => {
                ClientController.view.toggleLoadingScreen(false)

                ClientController.render("auth")
            }, 2000);

        });



        // Reconexão (após perda de conexão)
        ClientController.socket.on("connect", async () => {
            setTimeout(() => {
                if (ClientController.areAssetsLoaded == false) {
                    console.log("[front] carregando assets...")
                } else {
                    ClientController.view.toggleLoadingScreen(false)
                }
            }, 2000);
        });
    }

    static render(page: "auth" | "home" | "creating" | "joining" | "lobby" | "game") {
        switch (page) {
            case "auth":
                mobileNavigation.renderAuth = () => {
                    ClientController.authScreen = new AuthController(
                        ClientController.socket.id as string,
                        () => {
                            mobileNavigation.renderHome = () => new HomeController(AuthController.user)
                            mobileNavigation.renderHome()
                        }
                    )
                }
                mobileNavigation.renderAuth()
                break
        }
    }


    static async createLobby(words: string[]): Promise<string | "error"> {

        AuthController.user.isHost = true;

        if (ClientController.createLobbyDelay == true) {

            return "error"
        }

        else {

            ClientController.createLobbyDelay = true;

            return new Promise((resolve) => {
                ClientController.socket.emit("create-lobby", AuthController.user, words, (lobbyObject: lobby) => {

                    setTimeout(() => {
                        ClientController.createLobbyDelay = false;
                    }, 3000);

                    console.log("[front] (client-connection) lobby criado com código de convite:", lobbyObject.id)

                    const currentScreen = document.querySelector(".content")!.children[0] as HTMLElement
                    currentScreen.remove()

                    const lobby = new LobbyController(AuthController.user, lobbyObject.id, words)


                    resolve(lobbyObject.id as string)

                })
            })
        }
    }

    static async joinLobby(inviteCode: string) {

        AuthController.user.isHost = false;
        ClientController.socket.emit(`lobby-join`, inviteCode, AuthController.user, (isInviteValid: boolean) => {
            if (isInviteValid == true){
                const currentScreen = document.querySelector(".content")!.children[0] as HTMLElement
                currentScreen.remove()
        
                const lobby = new LobbyController(AuthController.user, inviteCode)
            }
        })
    }
}

export default ClientController