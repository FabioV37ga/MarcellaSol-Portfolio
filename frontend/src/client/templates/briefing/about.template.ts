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

            <div class="briefing-input-flex-box class="client-contact-fields">
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
                    accept="image/jpeg,image/png,image/webp"
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

                <div class="briefing-input-flex-box">
                    <div class="briefing-input-box">
                        <p>Metragem aproximada</p>
                        <div>55m²</div>
                    </div>

                    <div class="briefing-input-box">
                        <p>Propriedade</p>
                        <div>Própria</div>
                    </div>

                    <div class="briefing-input-box">
                        <p>Situação atual do imóvel</p>
                        <div>Em construção</div>
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

                <div class="briefing-input-box">
                    <label>Em qual cômodo desejam instalar o ar-condicionado?</label>
                    <select class="briefing-input" name="air-conditioning-room">
                        <option value="" selected disabled>Selecione um cômodo</option>
                        <option value="sala-de-estar">Sala de estar</option>
                        <option value="sala-de-jantar">Sala de jantar</option>
                        <option value="cozinha">Cozinha</option>
                        <option value="suite">Suíte</option>
                        <option value="segundo-quarto">Segundo quarto</option>
                        <option value="escritorio">Escritório</option>
                        <option value="varanda">Varanda</option>
                        <option value="outro">Outro</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <label>Anexar especificação do condomínio</label>
                    <input
                        type="file"
                        class="briefing-input"
                        accept="image/jpeg,image/png,image/webp"
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

                <div class="briefing-input-box">
                    <label>Quais tipos de automação desejam integrar?</label>
                    <small>Selecione uma ou mais opções.</small>
                    <select class="briefing-input" name="automation-types" multiple size="8">
                        <option value="iluminacao">Iluminação e criação de cenas</option>
                        <option value="climatizacao">Climatização</option>
                        <option value="cortinas-persianas">Cortinas e persianas</option>
                        <option value="audio-video">Áudio e vídeo</option>
                        <option value="seguranca">Segurança e monitoramento</option>
                        <option value="fechaduras-acesso">Fechaduras e controle de acesso</option>
                        <option value="irrigacao">Irrigação de plantas</option>
                        <option value="eletrodomesticos">Eletrodomésticos inteligentes</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <label>Em quais cômodos desejam instalar as automações?</label>
                    <small>Selecione um ou mais cômodos.</small>
                    <select class="briefing-input" name="automation-rooms" multiple size="9">
                        <option value="sala-de-estar">Sala de estar</option>
                        <option value="sala-de-jantar">Sala de jantar</option>
                        <option value="cozinha">Cozinha</option>
                        <option value="suite">Suíte</option>
                        <option value="segundo-quarto">Segundo quarto</option>
                        <option value="banheiro-lavabo">Banheiro / Lavabo</option>
                        <option value="escritorio">Escritório</option>
                        <option value="varanda">Varanda</option>
                        <option value="lavanderia">Lavanderia</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <label>
                        Plantas estruturais e plantas dos sistemas existentes fornecidas pela construtora
                    </label>
                    <small>Ex.: hidráulica, elétrica e ar-condicionado.</small>
                    <input type="file" class="briefing-input" multiple>
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

                <div class="briefing-input-flex-box">
                    <fieldset class="briefing-input-box">
                        <legend>Pets?</legend>
                        <div class="briefing-checkbox-box">
                            <input type="radio" name="has-pets" value="sim">
                            <label>Sim</label>

                            <input type="radio" name="has-pets" value="nao">
                            <label>Não</label>
                        </div>
                    </fieldset>

                    <div class="briefing-input-box">
                        <label>Conte um pouco sobre eles</label>
                        <textarea
                        
                            class="briefing-input-medium"
                            maxlength="200"
                            placeholder="Nome, espécie, idade, hábitos..."
                        ></textarea>
                        <small>0/200</small>
                    </div>
                </div>

                <fieldset class="briefing-input-row">
                    <legend>Mudanças futuras nos próximos anos</legend>
                    <small>Marque tudo o que se aplica à realidade de vocês.</small>

                    <div class="row-content">
                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="filhos">
                            <label>Ter filhos</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="novo-pet">
                            <label>Novo pet</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="trabalho-remoto">
                            <label>Trabalho remoto</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="acessibilidade">
                            <label>Acessibilidade futura</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="familiar">
                            <label>Familiar morando junto</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="nenhuma">
                            <label>Nenhuma prevista</label>
                        </div>

                        <div class="briefing-input-checkbox">
                            <input type="checkbox" value="outros">
                            <label>Outros, quais?</label>
                            <input
                                type="text"
                                class="briefing-input"
                                placeholder="Conte quais mudanças vocês imaginam"
                            >
                        </div>
                    </div>
                </fieldset>

                <fieldset class="briefing-input-box">
                    <legend>Quanto tempo vocês imaginam permanecer neste imóvel?</legend>
                    <small>Essa informação nos ajuda a entender suas decisões de hoje e do futuro.</small>

                    <div class="briefing-select-box">
                        <input type="radio" name="residence-time" value="ate-2-anos">
                        <label class="button-option">Até 2 anos</label>

                        <input type="radio" name="residence-time" value="2-5-anos">
                        <label class="button-option">De 2 a 5 anos</label>

                        <input type="radio" name="residence-time" value="mais-5-anos">
                        <label class="button-option">Mais de 5 anos</label>

                        <input type="radio" name="residence-time" value="incerto">
                        <label class="button-option">Não tenho certeza</label>
                    </div>
                </fieldset>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>
            </div>
    `
}