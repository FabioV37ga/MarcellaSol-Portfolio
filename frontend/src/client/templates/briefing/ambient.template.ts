import html from 'nanohtml'

const roomIcons: Record<string, string> = {
    "sala-de-estar": "sala-de-estar",
    "sala-de-jantar": "sala-de-jantar",
    cozinha: "cozinha",
    varanda: "varanda",
    lavanderia: "area-de-servico",
    "area-de-servico": "area-de-servico",
    suite: "suite",
    quarto: "segundo-quarto",
    dormitorio: "segundo-quarto",
    "segundo-quarto": "segundo-quarto",
    banheiro: "banheiro-lavabo",
    lavabo: "banheiro-lavabo",
    "banheiro-lavabo": "banheiro-lavabo"
}

function roomSlug(ambient: string) {
    return ambient
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/%20|\s+|\/+|_+/g, "-")
        .replace(/-+/g, "-")
}

function room(ambients: string[]){
    var totalRooms = ambients.length - 1
    var model: HTMLElement[] = []
    for (let i = 0; i <= totalRooms; i++){
        const slug = roomSlug(ambients[i])
        const icon = roomIcons[slug] ?? "imovel"
        model.push(
            html`
                <button type="button" class="briefing-environment-option" value="${slug}">
                    <img
                        class="briefing-environment-icon"
                        src="/images/briefing/rooms/${icon}.png"
                        alt=""
                        aria-hidden="true"
                    >
                    <span>${ambients[i]}</span>
                    <span aria-hidden="true">›</span>
                </button>
            `
        )
    }
    return model
}
export function ambient(ambients: string[], residentAmount: number){
    return html`
        <div class="form-page-09">

                <h1 class="briefing-title">Ambientes — visão geral</h1>

                <p class="briefing-subtitle">
                    Confira os ambientes selecionados para este projeto.
                </p>

                <div class="briefing-project-summary">
                    <img class="briefing-project-icon" src="/images/briefing/rooms/imovel.png" alt="Ícone do imóvel">
                    <div>
                        <strong>Tamanho aproximado:</strong>
                        <span data-briefing-property-area>Não informado</span>
                    </div>
                    <div>
                        <span>${residentAmount} ${residentAmount === 1 ? "pessoa" : "pessoas"}.</span>
                    </div>
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
