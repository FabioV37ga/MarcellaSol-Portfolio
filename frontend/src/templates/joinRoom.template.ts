import html from "nanohtml"

export function joinRoom():HTMLElement {
    return html`
    <section class="join-room">
        <div class="join-room-title">
            <span class="horizontal-bar"></span>
            <p>Entrar em sala</p>
            <span class="horizontal-bar"></span>
        </div>
        <div class="join-room-inputs">
            <input type="text" class="join-code" placeholder="Insira o código da sala...">
                
            </input type="text">
            <button class="joinRoomBtn">Entrar na sala</button>
            <button id="joinRoom-close">voltar</button>
        </div>
    </section>
`
}