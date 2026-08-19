import html from 'nanohtml'
import u from 'umbrellajs';

interface roomItem {
    id: number;
    index: number;
}

export function roomItem(view: HTMLElement, id: number, index: number) {
    var viewString = view.outerHTML
        .split("%id%").join(id.toString())
        .split("%index%").join(index.toString())

    console.log(viewString)
    return u(viewString).first() as HTMLElement
}



export interface FinishBriefingRoom {
    index: number;
    name: string;
    type: string;
    subtype?: string;
    options?: boolean[];
}

export interface FinishBriefingSummary {
    clientName?: string;
    projectName?: string;
    category?: string;
    propertyType?: string;
    residentAmount?: number;
}

const roomNames: Record<string, string> = {
    "sala-estar": "Sala de estar",
    "sala-jantar": "Sala de jantar",
    cozinha: "Cozinha",
    varanda: "Varanda",
    lavanderia: "Lavanderia",
    quarto: "Quarto",
    banheiro: "Banheiro",
    lavabo: "Lavabo"
}

const roomOptionNames: Record<string, string[]> = {
    varanda: [
        "Integração de varanda e sala"
    ],
    cozinha: [
        "Refeições rápidas"
    ],
    quarto: [
        "Utilizador e função principal",
        "Fluxo diário",
        "Tamanho da cama",
        "TV",
        "Espaço de leitura",
        "Home office",
        "Penteadeira/Camarim",
        "Estante/prateleiras",
        "Guarda-roupa",
        "Mesa de trabalho/estudo",
        "Quantidade de roupas e acessórios",
        "Preferências de armazenamento",
        "Equilíbrio entre armazenamento e leveza",
        "Desejos especiais"
    ]
}

const roomSubtypeNames: Record<string, string> = {
    dormitorio: "Dormitório",
    suite: "Suíte"
}

export function finishItem(
    index: number,
    name: string,
    options: boolean[] = [],
    type: string = name,
    subtype?: string
) {
    const selectedOptions = options
        .map((selected, optionIndex) => selected
            ? roomOptionNames[type]?.[optionIndex]
            : undefined
        )
        .filter((optionName): optionName is string => Boolean(optionName))

    const displayName = name || roomNames[type] || type
    const displaySubtype = subtype ? roomSubtypeNames[subtype] ?? subtype : ""

    return html`
        <article class="briefing-finish-room-card">
            <div class="briefing-finish-room-number">${index + 1}</div>
            <div>
                <h3>
                    ${displayName}
                    ${displaySubtype ? html`<span>${displaySubtype}</span>` : null}
                </h3>
                ${selectedOptions.length > 0
                    ? html`
                        <ul class="briefing-finish-option-list briefing-finish-option-columns">
                            ${selectedOptions.map(optionName => html`<li>${optionName}</li>`)}
                        </ul>
                    `
                    : html`
                        <p class="briefing-finish-empty">
                            Nenhuma opção adicional selecionada.
                        </p>
                    `
                }
            </div>
        </article>
    `
}

export function finishBriefing(
    investmentFlexibility: boolean,
    rooms: FinishBriefingRoom[],
    summary: FinishBriefingSummary = {}
) {
    const orderedRooms = [...rooms].sort((firstRoom, secondRoom) =>
        firstRoom.index - secondRoom.index
    )
    const propertyDescription = [summary.category, summary.propertyType]
        .filter(Boolean)
        .join(" · ") || "Não informado"

    return html`
        <div class="briefing-finish-container">
            <nav class="page-index" aria-label="Etapas do cadastro">
                <a class="root-index">Clientes</a>
                <p>/</p>
                <a class="root-index">Novo cliente</a>
                <p>/</p>
                <a class="root-index">Gerar briefing</a>
                <p>/</p>
                <span>Finalização</span>
            </nav>

            <header class="briefing-finish-title">
                <h1>Revisar e finalizar</h1>
                <p>
                    Confira os dados do cliente e as perguntas selecionadas para o briefing antes de finalizar.
                </p>
            </header>

            <div class="briefing-finish-window">
                <section class="briefing-finish-client">
                    <div class="briefing-finish-icon">
                        <i class="fa fa-user" aria-hidden="true"></i>
                    </div>
                    <div>
                        <span class="briefing-finish-eyebrow">Cliente criado</span>
                        <h2>${summary.clientName || "Não informado"}</h2>
                    </div>
                </section>

                <section class="briefing-finish-project">
                    <div class="briefing-finish-section-heading">
                        <div>
                            <span class="briefing-finish-eyebrow">Resumo do projeto</span>
                            <h2>${summary.projectName || "Não informado"}</h2>
                        </div>
                        <span class="briefing-finish-badge">${propertyDescription}</span>
                    </div>

                    <dl class="briefing-finish-project-data">
                        <div>
                            <dt>Moradores</dt>
                            <dd>${summary.residentAmount ?? 0}</dd>
                        </div>
                        <div>
                            <dt>Cômodos</dt>
                            <dd>${orderedRooms.length}</dd>
                        </div>
                        <div>
                            <dt>Pergunta de investimento</dt>
                            <dd>
                                <i
                                    class="fa ${investmentFlexibility ? "fa-check-circle" : "fa-times-circle"}"
                                    aria-hidden="true"
                                ></i>
                                ${investmentFlexibility ? "Incluída" : "Não inclusa"}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section class="briefing-finish-rooms">
                    <div class="briefing-finish-section-heading">
                        <div>
                            <span class="briefing-finish-eyebrow">Configuração</span>
                            <h2>Cômodos do briefing</h2>
                        </div>
                    </div>

                    <div class="briefing-finish-room-list">
                        ${orderedRooms.map(room => finishItem(
                            room.index,
                            room.name,
                            room.options ?? [],
                            room.type,
                            room.subtype
                        ))}
                    </div>
                </section>

                <div class="briefing-finish-actions">
                    <button id="briefing-finish-back" type="button">Voltar</button>
                    <button id="briefing-finish-confirm" type="button">
                        <i class="fa fa-check" aria-hidden="true"></i>
                        Finalizar
                    </button>
                </div>
            </div>
        </div>
    `
}
