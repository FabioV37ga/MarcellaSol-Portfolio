import html from "nanohtml"

export function createRoom(confirmedWords?: HTMLElement[]): HTMLElement {
    return html`
    <section class="create-room">
        <div class="create-room-title">
            <span class="horizontal-bar"></span>
            <p>Criação de sala</p>
            <span class="horizontal-bar"></span>
        </div>
        <div class="create-room-inputs">
            <button class="randomizeWords">
                <i class="fa fa-random" aria-hidden="true"></i>
            </button>
            <div class="create-room-words" contenteditable="true">
                ${confirmedWords ? confirmedWords : ""}                
            </div>
            <span class="comma-note">
                * Utilize vírgula para separar as palavras.
            </span>
            <button class="confirmRoomCreation">Criar sala</button>
            <button id="createRoom-close">voltar</button>
        </div>
    </section>
`
}

export function confirmedWord(word: string) {
    return html`
    <span class="confirmedWord" contenteditable="false">
        ${word}
    </span>
    `
}

