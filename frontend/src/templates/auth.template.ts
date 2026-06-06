import html from "nanohtml"

export function auth() {
    return html`
    <section class="auth">
        <div class="name-text">
            <span class="horizontal-bar"></span>
            <p>digite seu nome</p>
            <span class="horizontal-bar"></span>
        </div>
        <input type="text" id="nickname_input" placeholder="Nome...">
        <div class="char-selection">
            <div class="char-text">
                <span class="horizontal-bar"></span>
                <p>escolha seu personagem</p>
                <span class="horizontal-bar"></span>
            </div>
            <div class="chars">
                <div class="char charMale">
                    <div class="charPointer">▼</div>
                    <img src="./charMale.png" alt="" class="charSelected">
                    <p>Masculino</p>
                </div>
                <div class="char charFemale">
                    <img src="./charFemale.png" alt="">
                    <p>Feminino</p>
                </div>
            </div>
        </div>
        <button id="confirm-auth">confirmar</button>
    </section>
`
}

export function charPointer() {
    return html`
    <div class="charPointer">▼</div>
`
}
