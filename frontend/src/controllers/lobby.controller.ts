import { player } from "../models/player.model.js"
import { lobby } from "../models/lobby.model.js"
import LobbyView from "../views/lobby.view.js"
import { mobileNavigation } from "../utils/mobileNavigation.util.js";
import ClientController from "../controllers/client.controller.js";
import GameController from "./game.controller.js";
import { getButton } from "../selectors/lobby.selector.js";
import u from "umbrellajs";
import { game } from "../models/game.model.js";

class LobbyController {
    lobbyInfo!: lobby
    view: LobbyView;
    host: player;
    inviteCode: string;
    words?: string[];

    constructor(host: player, inviteCode: string, words?: string[]) {
        if (!mobileNavigation.isRenderingFromPopstate) {
            history.pushState({ tela: "lobby" }, '', '')
        }

        this.inviteCode = inviteCode
        this.host = host
        words ? this.words = words : null;

        this.view = new LobbyView(inviteCode, words ? "create" : "join")

        if (host.isHost){
            this.addPlayerToLobby(host)
            this.addClickEvents("host")
        }else{
            this.addClickEvents("player")
        }
        
        this.addSocketListeners(this.inviteCode)
    }

    addPlayerToLobby(player: player) {
        this.view.appendPlayer(player)
    }

    addClickEvents(playerType: string){
        switch (playerType){
            case "host":
                const startButton: HTMLElement = getButton()

                u(startButton).on("click", ()=>{
                    this.hostStartGame()
                })
            case "player":
                // Todo: adicionar "sair da sala"
                break
        }
    }

    addSocketListeners(inviteCode: string) {
        // console.log(inviteCode + "-player-joined added")


        // Evento de quando o usuário entra na sala.
        ClientController.socket.on(`${inviteCode}-join-success`, (lobbyObject: lobby) => {

            this.lobbyInfo = lobbyObject
            this.words = lobbyObject.words
            this.inviteCode = lobbyObject.id

            var players = lobbyObject.players

            for (let player = 0; player <= players.length - 1; player++) {
                this.addPlayerToLobby(players[player])
            }

            GameController.updateLobby(lobbyObject)
        })

        // Evento de quando o usuário já está na sala, e outro usuário entra na sala.
        ClientController.socket.on(`${inviteCode}-player-joined`, (lobbyObject: lobby) => {

            // console.log("Novo jogador entrou na sala:", lobbyObject)

            this.lobbyInfo = lobbyObject
            this.addPlayerToLobby(lobbyObject.players[lobbyObject.players.length - 1])

            GameController.updateLobby(lobbyObject)
        })

        ClientController.socket.on(`${inviteCode}-game-started`, (game: game)=>{
            this.lobbyInfo.game = game

            GameController.updateLobby(this.lobbyInfo)

            console.log(this.lobbyInfo)

            this.startGame()
        })
    }


    hostStartGame(){
        console.log(this.lobbyInfo)
        ClientController.socket.emit("start-game", this.lobbyInfo)
        console.log("CLICK - hostStartGame()")
    }

    startGame(){

    }

}

export default LobbyController