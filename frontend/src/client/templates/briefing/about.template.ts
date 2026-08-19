import html from 'nanohtml'

function residentInfo(amount: number) {
    var model: HTMLElement[] = []
    var id = 1;
    for (let i = 1; i <= amount; i++) {
        model.push(
            html`
            <div class="briefing-input-box">
                <label>Nome completo do responsável ${id}</label>
                <input type="text" class="briefing-input" autocomplete="name" id="resident-${id}-name">
            </div>

            <div class="briefing-input-flex-box client-contact-fields">
                <div class="briefing-input-box">
                    <label>Telefone</label>
                    <input type="tel" class="briefing-input-half" autocomplete="tel" id="resident-${id}-phone">
                </div>

                <div class="briefing-input-box">
                    <label>E-mail</label>
                    <input type="email" class="briefing-input-half" autocomplete="email" id="resident-${id}-mail">
                </div>
            </div>
            `
        )
        id++
    }

    return model

}

function airConditionerOptions() {
    return html`
        <fieldset class="briefing-input-box">
                <legend>O imóvel possui estrutura para ar-condicionado?</legend>

                <div class="briefing-select-box">
                    <label class="button-option">
                        <input type="radio" name="air-conditioning-structure" value="sim">
                        <span>Sim</span>
                    </label>

                    <label class="button-option">
                        <input type="radio" name="air-conditioning-structure" value="nao">
                        <span>Não</span>
                    </label>
                </div>
            </fieldset>

            <div class="briefing-input-box">
                <label>Anexar especificação do condomínio</label>
                <input
                    type="file"
                    class="briefing-input"
                    accept="image/*,.pdf,.doc,.docx,.odt,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx"
                >
            </div>
    `
}

export function about_1(residentAmount: number, showAirConditioner: boolean) {
    return html`
        <div class="form-page-01">
            <h1 class="briefing-title">Sobre vocês e o imóvel — parte 1</h1>
            <p class="briefing-subtitle">
                Vamos conhecer mais sobre vocês e alguns detalhes essenciais do imóvel.
            </p>

           ${residentInfo(residentAmount)}

            <div class="briefing-input-box">
                    <label>Contato principal do projeto</label>
                    <input type="text" class="briefing-input">
                </div>

                <div class="briefing-input-box">
                    <label>Endereço completo do imóvel</label>
                    <input type="text" class="briefing-input" autocomplete="street-address">
                </div>

                <div class="briefing-input-flex-box briefing-property-details">
                    <div class="briefing-input-box">
                        <label for="property-area">Metragem aproximada</label>
                        <div class="briefing-area-input">
                            <input
                                type="number"
                                class="briefing-input"
                                id="property-area"
                                name="property-area"
                                min="1"
                                step="0.01"
                                inputmode="decimal"
                                placeholder="Ex.: 55"
                            >
                            <span>m²</span>
                        </div>
                    </div>

                    <div class="briefing-input-box">
                        <label for="property-ownership">Propriedade</label>
                        <select class="briefing-input" id="property-ownership" name="property-ownership">
                            <option value="" selected disabled>Selecione...</option>
                            <option value="propria">Própria</option>
                            <option value="alugada">Alugada</option>
                        </select>
                    </div>

                    <div class="briefing-input-box briefing-property-status">
                        <label for="property-status">Situação atual do imóvel</label>
                        <select class="briefing-input" id="property-status" name="property-status">
                            <option value="" selected disabled>Selecione...</option>
                            <option value="antigo">Imóvel antigo</option>
                            <option value="pronto-para-morar">Pronto para morar</option>
                            <option value="em-construcao">Em construção</option>
                            <option value="na-planta">Na planta</option>
                            <option value="em-reforma">Em reforma</option>
                            <option value="ocupado">Atualmente ocupado</option>
                        </select>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <label>Data importante</label>
                    <input
                        type="text"
                    
                        class="briefing-input"
                        placeholder="Ex.: mudança prevista, entrega de chaves..."
                    >
                </div>

                <fieldset class="briefing-input-box">
                    <legend>O imóvel possui estrutura para ar-condicionado?</legend>

                    <div class="briefing-select-box">
                        <label class="button-option">
                            <input type="radio" name="air-conditioning-structure" value="sim">
                            <span>Sim</span>
                        </label>

                        <label class="button-option">
                            <input type="radio" name="air-conditioning-structure" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </fieldset>

                <div class="briefing-input-box briefing-air-conditioning-details" hidden>
                    <label>Em qual cômodo desejam instalar o ar-condicionado?</label>
                    <small>Selecione um ou mais cômodos.</small>
                    <div class="briefing-options briefing-air-conditioning-options">
                        <label><input type="checkbox" name="air-conditioning-room" value="sala-de-estar"> <span>Sala de estar</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="sala-de-jantar"> <span>Sala de jantar</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="cozinha"> <span>Cozinha</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="suite"> <span>Suíte</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="segundo-quarto"> <span>Segundo quarto</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="escritorio"> <span>Escritório</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="varanda"> <span>Varanda</span></label>
                        <label><input type="checkbox" name="air-conditioning-room" value="outro"> <span>Outro</span></label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <label>Anexar especificação do condomínio</label>
                    <input
                        type="file"
                        class="briefing-input"
                        accept="image/*,.pdf,.doc,.docx,.odt,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx"
                    >
                </div>

                <fieldset class="briefing-input-box">
                    <legend>Desejam integrar automação?</legend>

                    <div class="briefing-select-box">
                        <label class="button-option">
                            <input type="radio" name="home-automation" value="sim">
                            <span>Sim</span>
                        </label>

                        <label class="button-option">
                            <input type="radio" name="home-automation" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </fieldset>

                <div class="briefing-input-box briefing-automation-details" hidden>
                    <label>Quais tipos de automação desejam integrar?</label>
                    <small>Selecione uma ou mais opções.</small>
                    <div class="briefing-options briefing-automation-options">
                        <label><input type="checkbox" name="automation-types" value="iluminacao"> <span>Iluminação e criação de cenas</span></label>
                        <label><input type="checkbox" name="automation-types" value="climatizacao"> <span>Climatização</span></label>
                        <label><input type="checkbox" name="automation-types" value="cortinas-persianas"> <span>Cortinas e persianas</span></label>
                        <label><input type="checkbox" name="automation-types" value="audio-video"> <span>Áudio e vídeo</span></label>
                        <label><input type="checkbox" name="automation-types" value="seguranca"> <span>Segurança e monitoramento</span></label>
                        <label><input type="checkbox" name="automation-types" value="fechaduras-acesso"> <span>Fechaduras e controle de acesso</span></label>
                        <label><input type="checkbox" name="automation-types" value="irrigacao"> <span>Irrigação de plantas</span></label>
                        <label><input type="checkbox" name="automation-types" value="eletrodomesticos"> <span>Eletrodomésticos inteligentes</span></label>
                    </div>
                </div>

                <div class="briefing-input-box briefing-automation-details" hidden>
                    <label>Em quais cômodos desejam instalar as automações?</label>
                    <small>Selecione um ou mais cômodos.</small>
                    <div class="briefing-options briefing-automation-options">
                        <label><input type="checkbox" name="automation-rooms" value="sala-de-estar"> <span>Sala de estar</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="sala-de-jantar"> <span>Sala de jantar</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="cozinha"> <span>Cozinha</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="suite"> <span>Suíte</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="segundo-quarto"> <span>Segundo quarto</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="banheiro-lavabo"> <span>Banheiro / Lavabo</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="escritorio"> <span>Escritório</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="varanda"> <span>Varanda</span></label>
                        <label><input type="checkbox" name="automation-rooms" value="lavanderia"> <span>Lavanderia</span></label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <label>
                        Plantas estruturais e plantas dos sistemas existentes fornecidas pela construtora
                    </label>
                    <small>Ex.: hidráulica, elétrica e ar-condicionado.</small>
                    <input type="file" class="briefing-input" accept="image/*,.pdf,.doc,.docx,.odt,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx" multiple>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>
            </div>
        </div>
    `
}

export function about_2() {
    return html`
        <div class="form-page-02">
                <h1 class="briefing-title">Sobre vocês e o imóvel — parte 2</h1>
                <p class="briefing-subtitle">
                    Conte mais sobre as pessoas que vivem no imóvel.
                </p>

                <div class="briefing-input-box">
                    <label>Quem vive atualmente no imóvel?</label>
                    <small>Conte-nos sobre as pessoas que moram ou vão morar neste imóvel.</small>
                    <textarea
                    
                        class="briefing-input-big"
                        maxlength="500"
                        placeholder="Ex.: somos um casal. Ele trabalha em home office e eu trabalho presencialmente. Gostamos de receber amigos aos finais de semana."
                    ></textarea>
                    <small>0/500</small>
                </div>

                <div class="briefing-input-box">
                    <fieldset class="briefing-input-box">
                        <legend>Pets?</legend>
                        <div class="briefing-select-box">
                            <label class="button-option">
                                <input type="radio" name="has-pets" value="sim">
                                <span>Sim</span>
                            </label>

                            <label class="button-option">
                                <input type="radio" name="has-pets" value="nao">
                                <span>Não</span>
                            </label>
                        </div>
                    </fieldset>

                    <div class="briefing-input-box briefing-pet-details" hidden>
                        <label>Conte um pouco sobre eles</label>
                        <textarea
                        
                            class="briefing-input-medium"
                            maxlength="200"
                            placeholder="Nome, espécie, idade, hábitos..."
                        ></textarea>
                        <small>0/200</small>
                    </div>
                </div>

                <fieldset class="briefing-input-box">
                    <legend>Mudanças futuras nos próximos anos</legend>
                    <small>Marque tudo o que se aplica à realidade de vocês.</small>

                    <div class="briefing-select-box briefing-future-changes">
                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="filhos">
                            <span>Ter filhos</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="novo-pet">
                            <span>Novo pet</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="trabalho-remoto">
                            <span>Trabalho remoto</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="acessibilidade">
                            <span>Acessibilidade futura</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="familiar">
                            <span>Familiar morando junto</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="nenhuma">
                            <span>Nenhuma prevista</span>
                        </label>

                        <label class="button-option">
                            <input type="checkbox" name="future-changes" value="outros">
                            <span>Outros</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        class="briefing-input briefing-future-other"
                        data-briefing-other-for="future-changes"
                        placeholder="Conte quais outras mudanças vocês imaginam"
                        hidden
                    >
                </fieldset>

                <fieldset class="briefing-input-box">
                    <legend>Quanto tempo vocês imaginam permanecer neste imóvel?</legend>
                    <small>Essa informação nos ajuda a entender suas decisões de hoje e do futuro.</small>

                    <div class="briefing-select-box">
                        <label class="button-option">
                            <input type="radio" name="residence-time" value="ate-2-anos">
                            <span>Até 2 anos</span>
                        </label>

                        <label class="button-option">
                            <input type="radio" name="residence-time" value="2-5-anos">
                            <span>De 2 a 5 anos</span>
                        </label>

                        <label class="button-option">
                            <input type="radio" name="residence-time" value="mais-5-anos">
                            <span>Mais de 5 anos</span>
                        </label>

                        <label class="button-option">
                            <input type="radio" name="residence-time" value="incerto">
                            <span>Não tenho certeza</span>
                        </label>
                    </div>
                </fieldset>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>
            </div>
    `
}
