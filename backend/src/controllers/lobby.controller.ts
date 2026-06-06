import { lobbies, addLobby } from "../database/lobbies.db";
import { lobby } from "../models/lobby.model";
import { player } from "../models/player.model";

// Classe responsável por construir e alterar um lobby.
class LobbyController{
    inviteCode: string;
    host: player;
    players: player[];
    words: string[];
    state: string;
    lobbyObject: lobby

    constructor(inviteCode: string, host: player, words: string[]){

        this.inviteCode = inviteCode
        this.host = host
        this.players = [host]
        this.words = words
        this.state = "waitingPlayers"

        console.log("Lobby criado: " + inviteCode)
        
        this.lobbyObject = {
            id: this.inviteCode,
            host: this.host,
            players: this.players,
            words: this.words,
            state: this.state
        }
        
        addLobby(this.lobbyObject)
        
    }
}

export default LobbyController