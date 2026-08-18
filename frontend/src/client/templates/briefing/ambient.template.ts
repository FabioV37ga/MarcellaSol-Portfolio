import html from 'nanohtml'

function room(ambients: string[]){
    var totalRooms = ambients.length - 1
    var model: HTMLElement[] = []
    for (let i = 0; i <= totalRooms; i++){
        model.push(
            html`
                <button type="button" class="briefing-environment-option" value="${ambients[i].replace("%20","-")}">
                    <div class="image-placeholder">Placeholder da imagem</div>
                    <span>${ambients[i]}</span>
                    <span aria-hidden="true">›</span>
                </button>
            `
        )
    }
    return model
}
var a = ["sala de estar", "sala de jantar", "cozinha", "varanda", "lavanderia", "suite", "quarto", "segundo-quarto", "banheiro", "lavabo"]

export function ambient(ambients: string[]){
    console.log(ambients)
    return html`
        <div class="form-page-09">

                <h1 class="briefing-title">Ambientes — visão geral</h1>

                <p class="briefing-subtitle">
                    Confira os ambientes selecionados para este projeto.
                </p>

                <div class="briefing-project-summary">
                    <div class="image-placeholder">Placeholder da imagem</div>
                    <span>55 m²</span>
                    <span>·</span>
                    <span>casal</span>
                </div>

                <div class="briefing-environments">
                    ${room(ambients)}
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}