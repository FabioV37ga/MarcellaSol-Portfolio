import html from 'nanohtml'

export function home(){
    return html`
    <div class="form-page-00">
        <h1 class="briefing-title">Bem-vindo(a) ao seu briefing.</h1>
        <p class="briefing-description">
            Este briefing nos ajuda a entender seu momento, suas necessidades e como podemos transformar esse
            imóvel em um espaço que faça sentido para a vida que você quer viver.
        </p>

        <div class="briefing-00-type">
            Apartamento, 55m², residencial
        </div>

        <div class="briefing-00-time">
            Este briefing leva cerca de 15 a 20 minutos.
        </div>

        <div class="briefing-navigation">
            <a>Começar briefing →</a>
        </div>
    </div>
    `
}