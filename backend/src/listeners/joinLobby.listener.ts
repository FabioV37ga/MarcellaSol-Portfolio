import { Socket } from "socket.io";
import { lobbies } from "../database/lobbies.db";

export function handleJoinLobby(socket: Socket) {

    socket.on("lobby-join", (inviteCode, user, isInviteValid) => {
        console.log("evento de join recebido")

        var joinedLobbyIndex = lobbies.findIndex(lobby => lobby.id == inviteCode)

        // if (!joinedLobby) emit("join-error")

        if (lobbies[joinedLobbyIndex]) {
            lobbies[joinedLobbyIndex].players.push(user)

            isInviteValid(true)

            socket.join(inviteCode)
            socket.emit(`${inviteCode}-join-success`, lobbies[joinedLobbyIndex])
            socket.to(inviteCode).emit(`${inviteCode}-player-joined`, lobbies[joinedLobbyIndex])
        }else{
            isInviteValid(false)
            console.log("evento de join recusado: código de convite inválido")
        }

    })
}