import { Server } from "socket.io";

import { handleCreateLobby } from "./createLobby.listener";
import { handleJoinLobby } from "./joinLobby.listener";
import { handleStartGame } from "./startGame.listener";

export function addSocketListeners(io: Server) {

    io.on("connection", (socket) => {
        console.log("--+ jogador conectado:", socket.id);

        socket.onAny((event, ...args) => {
            // console.log("evento recebido:", event, args)
        });

        handleJoinLobby(socket)
        handleCreateLobby(socket)

        handleStartGame(socket)
    });
}