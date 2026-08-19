import html from 'nanohtml'

export function preferences_1(){
    return html`
        <div class="form-page-06">

                <h1 class="briefing-title">Preferências — atmosfera geral</h1>

                <p class="briefing-subtitle">
                    Conte o que mais combina com vocês para criarmos<br>
                    um projeto com a sua essência.
                </p>

                <div class="briefing-input-box">
                    <p>Escolha a atmosfera que mais combina com vocês:</p>

                    <div class="briefing-options briefing-style-options">
                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="contemporaneo-brasileiro"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/contemporaneo-brasileiro.png" alt="Ambiente no estilo contemporâneo brasileiro">
                            <span>Opção A</span>
                            <strong>Contemporâneo brasileiro</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="moderno"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/moderno.png" alt="Ambiente no estilo moderno">
                            <span>Opção B</span>
                            <strong>Moderno</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="japandi"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/japandi.png" alt="Ambiente no estilo japandi">
                            <span>Opção C</span>
                            <strong>Japandi</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="industrial"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/industrial.png" alt="Ambiente no estilo industrial">
                            <span>Opção D</span>
                            <strong>Industrial</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="rustico"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/rustico.png" alt="Ambiente no estilo rústico">
                            <span>Opção E</span>
                            <strong>Rústico</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="boho"
                            >
                            <img class="briefing-option-image" src="/images/briefing/styles/boho.png" alt="Ambiente no estilo boho">
                            <span>Opção F</span>
                            <strong>Boho</strong>
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box" data-max-selections="5">
                    <p>O que mais chamou a atenção nas imagens escolhidas?</p>
                    <span>Selecione até 5 itens.</span>

                    <div class="briefing-options">
                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="cores"
                            >
                            <span>Cores</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="materiais"
                            >
                            <span>Materiais</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="iluminacao"
                            >
                            <span>Iluminação</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="texturas"
                            >
                            <span>Texturas</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="mobiliario"
                            >
                            <span>Mobiliário</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="sensacao-de-aconchego"
                            >
                            <span>Sensação de aconchego</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="integracao-dos-ambientes"
                            >
                            <span>Integração dos ambientes</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="simplicidade"
                            >
                            <span>Simplicidade</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="sofisticacao"
                            >
                            <span>Sofisticação</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="natureza"
                            >
                            <span>Natureza</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="organizacao"
                            >
                            <span>Organização</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-66"
                                value="outros"
                            >
                            <span>Outros</span>
                        </label>
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
                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="acolhedora"
                            >
                            <span>Acolhedora</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="leve"
                            >
                            <span>Leve</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="sofisticada"
                            >
                            <span>Sofisticada</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="funcional"
                            >
                            <span>Funcional</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="pratica"
                            >
                            <span>Prática</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="natural"
                            >
                            <span>Natural</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="moderna"
                            >
                            <span>Moderna</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="classica"
                            >
                            <span>Clássica</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="elegante"
                            >
                            <span>Elegante</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="despojada"
                            >
                            <span>Despojada</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="criativa"
                            >
                            <span>Criativa</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="minimalista"
                            >
                            <span>Minimalista</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="confortavel"
                            >
                            <span>Confortável</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="inspiradora"
                            >
                            <span>Inspiradora</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="form-input-67"
                                value="outros"
                            >
                            <span>Outros</span>
                        </label>
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

export function preferences_2(){
    return html`
        <div class="form-page-07">

                <h1 class="briefing-title">Preferências — cores, madeiras e formas</h1>

                <p class="briefing-subtitle">
                    Vamos entender suas preferências visuais para orientar<br>
                    nossas escolhas com mais precisão.
                </p>

                <div class="briefing-input-box">
                    <p>Qual família de cores vocês mais gostam?</p>

                    <div class="briefing-options briefing-style-options briefing-material-options">
                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="neutros-quentes"
                            >
                            <img class="briefing-option-image" src="/images/briefing/palettes/neutros-quentes.png" alt="Paleta de cores neutras quentes">
                            <span>Opção A</span>
                            <strong>Neutros quentes</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="neutros-frios"
                            >
                            <img class="briefing-option-image" src="/images/briefing/palettes/neutros-frios.png" alt="Paleta de cores neutras frias">
                            <span>Opção B</span>
                            <strong>Neutros frios</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="tons-terrosos-naturais"
                            >
                            <img class="briefing-option-image" src="/images/briefing/palettes/tons-terrosos.png" alt="Paleta de tons terrosos e naturais">
                            <span>Opção C</span>
                            <strong>Tons terrosos e naturais</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="cores-suaves"
                            >
                            <img class="briefing-option-image" src="/images/briefing/palettes/cores-suaves.png" alt="Paleta de cores suaves">
                            <span>Opção D</span>
                            <strong>Cores suaves</strong>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-65"
                                value="cores-profundas"
                            >
                            <img class="briefing-option-image" src="/images/briefing/palettes/cores-profundas.png" alt="Paleta de cores profundas">
                            <span>Opção E</span>
                            <strong>Cores profundas</strong>
                        </label>
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

                <div class="briefing-input-box">
                    <p>Qual tonalidade de madeira vocês preferem?</p>
                    <span>Selecione uma preferência geral.</span>

                    <div class="briefing-options briefing-style-options briefing-material-options briefing-wood-options">
                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-1"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-1.png" alt="Amostra da madeira 1">
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-2"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-2.png" alt="Amostra da madeira 2">
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-3"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-3.png" alt="Amostra da madeira 3">
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-6"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-6.png" alt="Amostra da madeira 6">
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-7"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-7.png" alt="Amostra da madeira 7">
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-68"
                                value="madeira-8"
                            >
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-8.png" alt="Amostra da madeira 8">
                        </label>

                        <label>
                            <input type="radio" name="form-input-68" value="madeira-9">
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-9.png" alt="Amostra da madeira 9">
                        </label>

                        <label>
                            <input type="radio" name="form-input-68" value="madeira-10">
                            <img class="briefing-option-image" src="/images/briefing/woods/madeira-10.png" alt="Amostra da madeira 10">
                        </label>
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
                        <label>
                            <input
                                type="radio"
                                name="form-input-69"
                                value="retas"
                            >
                            <img class="briefing-option-image" src="/images/briefing/shapes/retas.png" alt="Móvel de linhas retas">
                            <span>Retas</span>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-69"
                                value="curvas"
                            >
                            <img class="briefing-option-image" src="/images/briefing/shapes/curvas.png" alt="Poltrona de linhas curvas">
                            <span>Curvas</span>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-69"
                                value="mistura-equilibrada"
                            >
                            <img class="briefing-option-image" src="/images/briefing/shapes/mistura-equilibrada.png" alt="Composição equilibrada de linhas retas e curvas">
                            <span>Mistura equilibrada</span>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="form-input-69"
                                value="curvas-em-destaque"
                            >
                            <img class="briefing-option-image" src="/images/briefing/shapes/curvas-em-destaque.png" alt="Composição com formas curvas em destaque">
                            <span>Curvas em destaque</span>
                        </label>
                    </div>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}


export function preferences_3(showCostObservation = true){
    return html`
        <div class="form-page-08">

                <h1 class="briefing-title">Preferências — texturas, materiais e referências</h1>

                <p class="briefing-subtitle">
                    Conte para nós o que mais combina com vocês.
                </p>

                <div class="briefing-input-box">
                    <p>Elementos que vocês gostam e desejam considerar no projeto</p>

                    <div class="briefing-options briefing-elements-options">
                        <label>
                            <input type="checkbox" name="form-input-70" value="ripado">
                            <img class="briefing-element-icon" src="/images/briefing/elements/ripado.png" alt="Ícone de ripado">
                            <span>Ripado</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="muxarabi">
                            <img class="briefing-element-icon" src="/images/briefing/elements/muxarabi.png" alt="Ícone de muxarabi">
                            <span>Muxarabi</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="palhinha-fibra-natural">
                            <img class="briefing-element-icon" src="/images/briefing/elements/palhinha-fibra-natural.png" alt="Ícone de palhinha e fibra natural">
                            <span>Palhinha / Fibra natural</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="vidro-canelado">
                            <img class="briefing-element-icon" src="/images/briefing/elements/vidro-canelado.png" alt="Ícone de vidro canelado">
                            <span>Vidro canelado</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="serralheria">
                            <img class="briefing-element-icon" src="/images/briefing/elements/serralheria.png" alt="Ícone de serralheria">
                            <span>Serralheria</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="marcenaria-curva">
                            <img class="briefing-element-icon" src="/images/briefing/elements/marcenaria-curva.png" alt="Ícone de marcenaria curva">
                            <span>Marcenaria curva</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="paineis-lisos">
                            <img class="briefing-element-icon" src="/images/briefing/elements/paineis-lisos.png" alt="Ícone de painéis lisos">
                            <span>Painéis lisos</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-70" value="pedra-veios-marcantes">
                            <img class="briefing-element-icon" src="/images/briefing/elements/pedra-veios-marcantes.png" alt="Ícone de pedra com veios marcantes">
                            <span>Pedra com veios marcantes</span>
                        </label>

                    </div>

                    ${showCostObservation ? html`<div class="briefing-info-box briefing-cost-observation">
                        <span class="briefing-info-icon" aria-hidden="true">i</span>
                        <span>Ripados, muxarabi, palhinha e marcenaria curva costumam aumentar o custo da marcenaria.</span>
                    </div>` : null}
                </div>

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
                        <label>
                            <input type="radio" name="form-input-73" value="baixa">
                            <strong>Baixa manutenção</strong>
                            <span>Praticidade no dia a dia</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-73" value="moderada">
                            <strong>Manutenção moderada</strong>
                            <span>Equilíbrio entre beleza e cuidado</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-73" value="alta">
                            <strong>Alta manutenção</strong>
                            <span>Prioriza estética e exclusividade</span>
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Referências visuais (opcional)</p>

                    <div class="briefing-file-upload">
                        <div class="image-placeholder">Placeholder da imagem</div>
                        <p>Arraste e solte imagens aqui ou clique para enviar</p>
                        <small>JPG, JPEG ou PNG, até 20 MB cada.</small>
                        <input
                            type="file"
                            class="briefing-input"
                            accept="image/jpeg,image/png"
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
