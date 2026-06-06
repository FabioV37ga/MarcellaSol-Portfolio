import html from "nanohtml"
import AuthController from "../controllers/auth.controller.js"

export function lobbyScreen(inviteCode: string) {
    return html`
        <section class="lobby">
            <div class="lobby-title">
                <span class="horizontal-bar"></span>
                <p class="lobby-title-p">
                    Sala: <span id="lobby-title-inviteCode">${inviteCode}</span>
                </p>
                <span class="horizontal-bar"></span>
            </div>
            <div class="lobby-waiting">
                Aguardando jogadores...
            </div>
            <ul class="lobby-playerList">
                
            </ul>
            <p class="wait-playerCount">
                Esperando 1/6 jogadores...
            </p>
            ${AuthController.user.isHost ?
            startGame :
            null
        }
            
        </section>
    
    `
}

export function lobbyPlayer(char: string, nickname: string, isHost: boolean) {
    return html`
    <li class="lobby-player">
        <img src="./${char}.png" alt="">
        <p class="player-nickname">
            ${nickname}
        </p>
        ${isHost ? hostMark : ""}
    </li>
    `
}

const hostMark: HTMLElement =
    html`
    <div class="player-hostMark">
        host
    </div>
`

const startGame: HTMLElement =
    html`
    <button id="host-startGame">
        Iniciar partida
    </button>
`