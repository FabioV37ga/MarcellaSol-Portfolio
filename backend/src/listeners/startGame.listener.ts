import { Socket } from "socket.io";
import { lobby } from "../models/lobby.model";
import { player } from "../models/player.model";
import { game } from "../models/game.model";

export function handleStartGame(socket: Socket) {
    socket.on("start-game", (lobby: lobby) => {
        console.log("---------------------------------------------------------------------------------")
        const playerOrder: player[] = shufflePlayerOrder(lobby.players)

        const gameObject: game = {
            state: "choosingImpostor",
            impostor: chooseImpostor(lobby.players),
            order: playerOrder,
            turn: playerOrder[0],
            selectedWord: chooseWord(lobby.words)
        }

        console.log(gameObject)
        socket.emit(`${lobby.id}-game-started`, gameObject)
    })
}

function chooseImpostor(players: player[]): player {
    var randomKey = Math.floor(Math.random() * players.length - 1)

    return players[randomKey]
}

function shufflePlayerOrder<T>(array: T[]): T[] {
    const players = [...array];

    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }

    return players;
}

function chooseWord(words: string[]){
    var randomKey = Math.floor(Math.random() * words.length - 1)

    return words[randomKey]
}