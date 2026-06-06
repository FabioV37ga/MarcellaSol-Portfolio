import { lobby } from "../models/lobby.model.js";

class GameController {
    static lobby: lobby

    static updateLobby(lobby: lobby) {
        GameController.lobby = lobby
    }
}

export default GameController