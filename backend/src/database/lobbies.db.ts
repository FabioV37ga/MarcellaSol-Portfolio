import { lobby } from "../models/lobby.model"


export function addLobby(lobby: lobby){
    lobbies.push(lobby)
    console.log(lobbies)
}

export var lobbies: lobby[] = [];