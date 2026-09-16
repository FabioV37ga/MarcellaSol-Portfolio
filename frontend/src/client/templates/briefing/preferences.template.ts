import html from 'nanohtml'
import { briefingDescriptiveOptions, briefingSimpleOptions } from './components/briefing-options.template.js'
import { briefingVisualOptions } from './components/briefing-visual-options.template.js'
import { surfaceFinishesTable } from './components/surface-finishes.template.js'

const atmosphereOptions = [
    { value: "contemporaneo-brasileiro", imageSrc: "/images/briefing/styles/contemporaneo-brasileiro.png", imageAlt: "Ambiente no estilo contemporâneo brasileiro", badge: "Opção A", title: "Contemporâneo brasileiro" },
    { value: "moderno", imageSrc: "/images/briefing/styles/moderno.png", imageAlt: "Ambiente no estilo moderno", badge: "Opção B", title: "Moderno" },
    { value: "japandi", imageSrc: "/images/briefing/styles/japandi.png", imageAlt: "Ambiente no estilo japandi", badge: "Opção C", title: "Japandi" },
    { value: "industrial", imageSrc: "/images/briefing/styles/industrial.png", imageAlt: "Ambiente no estilo industrial", badge: "Opção D", title: "Industrial" },
    { value: "rustico", imageSrc: "/images/briefing/styles/rustico.png", imageAlt: "Ambiente no estilo rústico", badge: "Opção E", title: "Rústico" },
    { value: "boho", imageSrc: "/images/briefing/styles/boho.png", imageAlt: "Ambiente no estilo boho", badge: "Opção F", title: "Boho" }
];

const colorPaletteOptions = [
    { value: "neutros-quentes", imageSrc: "/images/briefing/palettes/neutros-quentes.png", imageAlt: "Paleta de cores neutras quentes", badge: "Opção A", title: "Neutros quentes" },
    { value: "neutros-frios", imageSrc: "/images/briefing/palettes/neutros-frios.png", imageAlt: "Paleta de cores neutras frias", badge: "Opção B", title: "Neutros frios" },
    { value: "tons-terrosos-naturais", imageSrc: "/images/briefing/palettes/tons-terrosos.png", imageAlt: "Paleta de tons terrosos e naturais", badge: "Opção C", title: "Tons terrosos e naturais" },
    { value: "cores-suaves", imageSrc: "/images/briefing/palettes/cores-suaves.png", imageAlt: "Paleta de cores suaves", badge: "Opção D", title: "Cores suaves" },
    { value: "cores-profundas", imageSrc: "/images/briefing/palettes/cores-profundas.png", imageAlt: "Paleta de cores profundas", badge: "Opção E", title: "Cores profundas" }
];

const woodOptions = [1, 2, 3, 6, 7, 8, 9, 10].map(number => ({
    value: `madeira-${number}`,
    imageSrc: `/images/briefing/woods/madeira-${number}.png`,
    imageAlt: `Amostra da madeira ${number}`
}));

const shapeOptions = [
    { value: "retas", imageSrc: "/images/briefing/shapes/retas.png", imageAlt: "Móvel de linhas retas", label: "Retas" },
    { value: "curvas", imageSrc: "/images/briefing/shapes/curvas.png", imageAlt: "Poltrona de linhas curvas", label: "Curvas" },
    { value: "mistura-equilibrada", imageSrc: "/images/briefing/shapes/mistura-equilibrada.png", imageAlt: "Composição equilibrada de linhas retas e curvas", label: "Mistura equilibrada" },
    { value: "curvas-em-destaque", imageSrc: "/images/briefing/shapes/curvas-em-destaque.png", imageAlt: "Composição com formas curvas em destaque", label: "Curvas em destaque" }
];

const elementOptions = [
    { value: "ripado", imageSrc: "/images/briefing/elements/ripado.png", imageAlt: "Ícone de ripado", imageClass: "briefing-element-icon", label: "Ripado" },
    { value: "muxarabi", imageSrc: "/images/briefing/elements/muxarabi.png", imageAlt: "Ícone de muxarabi", imageClass: "briefing-element-icon", label: "Muxarabi" },
    { value: "palhinha-fibra-natural", imageSrc: "/images/briefing/elements/palhinha-fibra-natural.png", imageAlt: "Ícone de palhinha e fibra natural", imageClass: "briefing-element-icon", label: "Palhinha / Fibra natural" },
    { value: "vidro-canelado", imageSrc: "/images/briefing/elements/vidro-canelado.png", imageAlt: "Ícone de vidro canelado", imageClass: "briefing-element-icon", label: "Vidro canelado" },
    { value: "serralheria", imageSrc: "/images/briefing/elements/serralheria.png", imageAlt: "Ícone de serralheria", imageClass: "briefing-element-icon", label: "Serralheria" },
    { value: "marcenaria-curva", imageSrc: "/images/briefing/elements/marcenaria-curva.png", imageAlt: "Ícone de marcenaria curva", imageClass: "briefing-element-icon", label: "Marcenaria curva" },
    { value: "paineis-lisos", imageSrc: "/images/briefing/elements/paineis-lisos.png", imageAlt: "Ícone de painéis lisos", imageClass: "briefing-element-icon", label: "Painéis lisos" },
    { value: "pedra-veios-marcantes", imageSrc: "/images/briefing/elements/pedra-veios-marcantes.png", imageAlt: "Ícone de pedra com veios marcantes", imageClass: "briefing-element-icon", label: "Pedra com veios marcantes" }
];

const maintenanceOptions = [
    { value: "baixa", label: "Baixa manutenção", description: "Praticidade no dia a dia" },
    { value: "moderada", label: "Manutenção moderada", description: "Equilíbrio entre beleza e cuidado" },
    { value: "alta", label: "Alta manutenção", description: "Prioriza estética e exclusividade" }
];

const visualAttentionOptions = [
    { value: "cores", label: "Cores" },
    { value: "materiais", label: "Materiais" },
    { value: "iluminacao", label: "Iluminação" },
    { value: "texturas", label: "Texturas" },
    { value: "mobiliario", label: "Mobiliário" },
    { value: "sensacao-de-aconchego", label: "Sensação de aconchego" },
    { value: "integracao-dos-ambientes", label: "Integração dos ambientes" },
    { value: "simplicidade", label: "Simplicidade" },
    { value: "sofisticacao", label: "Sofisticação" },
    { value: "natureza", label: "Natureza" },
    { value: "organizacao", label: "Organização" },
    { value: "outros", label: "Outros" }
];

const dreamHomeAdjectives = [
    { value: "acolhedora", label: "Acolhedora" },
    { value: "leve", label: "Leve" },
    { value: "sofisticada", label: "Sofisticada" },
    { value: "funcional", label: "Funcional" },
    { value: "pratica", label: "Prática" },
    { value: "natural", label: "Natural" },
    { value: "moderna", label: "Moderna" },
    { value: "classica", label: "Clássica" },
    { value: "elegante", label: "Elegante" },
    { value: "despojada", label: "Despojada" },
    { value: "criativa", label: "Criativa" },
    { value: "minimalista", label: "Minimalista" },
    { value: "confortavel", label: "Confortável" },
    { value: "inspiradora", label: "Inspiradora" },
    { value: "outros", label: "Outros" }
];

export function preferences_1() {
    return html`
        <div class="form-page-06">

                <h1 class="briefing-title">Preferências — atmosfera geral</h1>

                <p class="briefing-subtitle">
                    Conte o que mais combina com vocês para criarmos<br>
                    um projeto com a sua essência.
                </p>

                <div class="briefing-input-box" data-max-selections="3">
                    <p>Escolha a atmosfera que mais combina com vocês:</p>
                    <span>Escolha até 3.</span>

                    <div class="briefing-options briefing-style-options">
                        ${briefingVisualOptions("checkbox", "form-input-65", atmosphereOptions)}
                    </div>
                </div>

                <div class="briefing-input-box" data-max-selections="5">
                    <p>O que mais chamou a atenção nas imagens escolhidas?</p>
                    <span>Selecione até 5 itens.</span>

                    <div class="briefing-options">
                        ${briefingSimpleOptions("checkbox", "form-input-66", visualAttentionOptions)}
                    </div>

                    <div class="briefing-attention-details" hidden>
                        <label for="briefing-attention-details">Conte o que mais chamou a atenção</label>
                        <input
                            type="text"
                            class="briefing-input"
                            id="briefing-attention-details"
                            name="attention-details"
                            placeholder="Descreva aqui..."
                            disabled
                        >
                    </div>
                </div>

                <div class="briefing-input-box" data-max-selections="5">
                    <p>Como vocês descreveriam a casa dos sonhos?</p>
                    <span>Escolha até 5 adjetivos.</span>

                    <div class="briefing-options">
                        ${briefingSimpleOptions("checkbox", "form-input-67", dreamHomeAdjectives)}
                    </div>
                    <input
                        type="text"
                        class="briefing-input"
                        data-briefing-other-for="form-input-67"
                        placeholder="Qual outro adjetivo descreve a casa dos sonhos?"
                        hidden
                    >
                </div>

                <div class="briefing-input-box">
                    <p>O que definitivamente não combina com vocês?</p>
                    <span>Conte ou liste estilos, cores, materiais ou elementos que não fazem sentido.</span>

                    <textarea
                        class="briefing-input-big"
                        maxlength="1000"
                        placeholder="Ex.: Não gostamos de ambientes muito escuros ou com excesso de informações."
                    ></textarea>

                    <small>0/1000</small>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}

export function preferences_2() {
    return html`
        <div class="form-page-07">

                <h1 class="briefing-title">Preferências — cores, madeiras e formas</h1>

                <p class="briefing-subtitle">
                    Vamos entender suas preferências visuais para orientar<br>
                    nossas escolhas com mais precisão.
                </p>

                <div class="briefing-input-box" data-max-selections="2">
                    <p>Qual família de cores vocês mais gostam?</p>
                    <span>Escolha até 2.</span>

                    <div class="briefing-options briefing-style-options briefing-material-options">
                        ${briefingVisualOptions("checkbox", "form-input-65", colorPaletteOptions)}
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Quais cores vocês gostam?</p>
                    <span>Liste as cores que fazem sentido para vocês.</span>

                    <textarea
                        class="briefing-input-medium"
                        maxlength="300"
                        placeholder="Ex.: areia, off-white, terracota, verde oliva, azul petróleo."
                    ></textarea>

                    <small>0/300</small>
                </div>

                <div class="briefing-input-box">
                    <p>Quais cores vocês preferem evitar?</p>
                    <span>Liste as cores ou combinações que não combinam com vocês.</span>

                    <textarea
                        class="briefing-input-medium"
                        maxlength="300"
                        placeholder="Ex.: cores muito vibrantes, rosa pink, amarelo forte."
                    ></textarea>

                    <small>0/300</small>
                </div>

                <div class="briefing-input-box" data-max-selections="2">
                    <p>Qual tonalidade de madeira vocês preferem?</p>
                    <span>Escolha até 2.</span>

                    <div class="briefing-options briefing-style-options briefing-material-options briefing-wood-options">
                        ${briefingVisualOptions("checkbox", "form-input-68", woodOptions)}
                    </div>
                    <div class="briefing-wood-scale-labels" aria-hidden="true">
                        <span>Clara</span>
                        <span>Muito escura</span>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Qual linguagem de formas combina mais com vocês?</p>
                    <span>Escolha a que mais representa o estilo que desejam.</span>

                    <div class="briefing-options briefing-style-options briefing-shape-options">
                        ${briefingVisualOptions("radio", "form-input-69", shapeOptions)}
                    </div>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}


export function preferences_3(showCostObservation = true) {
    return html`
        <div class="form-page-08">

                <h1 class="briefing-title">Preferências — texturas, materiais e referências</h1>

                <p class="briefing-subtitle">
                    Conte para nós o que mais combina com vocês.
                </p>

                <div class="briefing-input-box">
                    <p>Elementos que vocês gostam e desejam considerar no projeto</p>

                    <div class="briefing-options briefing-elements-options">
                        ${briefingVisualOptions("checkbox", "form-input-70", elementOptions)}
                    </div>

                    ${showCostObservation ? html`<div class="briefing-info-box briefing-cost-observation">
                        <span class="briefing-info-icon" aria-hidden="true">i</span>
                        <span>Ripados, muxarabi, palhinha e marcenaria curva costumam aumentar o custo da marcenaria.</span>
                    </div>` : null}
                </div>

                ${surfaceFinishesTable()}

                <div class="briefing-input-box">
                    <p>Materiais que vocês gostam</p>
                    <textarea
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Ex.: madeira, linho, mármore, concreto, metal..."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-input-box">
                    <p>Materiais que vocês não gostam</p>
                    <textarea
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Ex.: fórmica brilhante, couro sintético, espelho fumê..."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-input-box">
                    <p>Preferência de manutenção</p>

                    <div class="briefing-options briefing-maintenance-options">
                        ${briefingDescriptiveOptions("radio", "form-input-73", maintenanceOptions)}
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Referências visuais (opcional)</p>

                    <div class="briefing-file-upload">
                        <div class="image-placeholder">Placeholder da imagem</div>
                        <p>Arraste e solte imagens ou documentos aqui ou clique para enviar</p>
                        <small>Imagens ou documentos, até 100 MB cada.</small>
                        <input
                            type="file"
                            class="briefing-input"
                            accept="image/*,.pdf,.doc,.docx,.odt,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx"
                            multiple
                        >
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Links de referências (obrigatório)</p>

                    <label>
                        <span>Pinterest</span>
                        <input
                            type="url"
                            class="briefing-input"
                            name="form-input-75"
                            placeholder="Cole aqui o link de referência do Pinterest"
                        >
                    </label>

                    <label>
                        <span>Instagram</span>
                        <input
                            type="url"
                            class="briefing-input"
                            name="form-input-76"
                            placeholder="Cole aqui o link de referência do Instagram"
                        >
                    </label>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}
