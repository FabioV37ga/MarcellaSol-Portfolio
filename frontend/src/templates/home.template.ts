import html from "nanohtml"

export default function home(userData: { nickname: string, character: string }) {
    return html`
    <section class="button-area">
        <div class="button-area-text">
            <span class="horizontal-bar"></span>
            <p>multiplayer</p>
            <span class="horizontal-bar"></span>
        </div>
        <div class="buttons">
            <button id="join-lobby-btn">Entrar em sala</button>
            <button id="create-lobby-btn">criar uma sala</button>
        </div>
        <div class="profile">
            <div class="profile-image">
                <img src="./${userData.character}.png" alt="">
            </div>
            <p class="profile-name">
                ${userData.nickname}
            </p>
        </div>
    </section>
`
}