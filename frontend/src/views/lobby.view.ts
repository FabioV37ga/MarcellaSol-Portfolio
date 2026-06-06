import ui from "./ui.view.js";
import { lobbyScreen, lobbyPlayer } from "../templates/lobby.template.js";
import { player } from "../models/player.model.js";
import { getButton, getPlayers, getContainer } from "../selectors/lobby.selector.js";


class LobbyView extends ui {
    startGameButton?: HTMLElement
    playerContainer: HTMLElement
    lobbyPlayers: HTMLElement[]

    constructor(inviteCode:string, viewType: string) {
        super()
        this.render(lobbyScreen(inviteCode))

        var startGameButton = getButton()

        if (startGameButton)
            this.startGameButton = startGameButton

        this.lobbyPlayers = []

        this.playerContainer = getContainer()

    }
    
    appendPlayer(player: player) {
        this.playerContainer.append(
            lobbyPlayer(player.character, player.nickname, player.isHost)
        )
        
        this.lobbyPlayers = getPlayers()
    }

}

export default LobbyView 