import { player } from "./player.model.js";


export interface game{
    state: "waiting" | "choosingImpostor" | "playerAsking" | "playersVoting" | "showingResults" | "gameRestarting";
    impostor: player
    order: player[]
    turn: player
    selectedWord: string
}