import html from 'nanohtml'

function flexibility() {
    return html`
     <div class="briefing-input-box">
        <label>Onde vocês têm flexibilidade e onde preferem não economizar?</label>
        <small>Conte um pouco sobre suas prioridades e limites.</small>
        <textarea
            class="briefing-input-big"
            maxlength="1000"
            placeholder="Ex.: temos flexibilidade em acabamentos de áreas de serviço, mas não abrimos mão de marcenaria de qualidade e boa iluminação."
        ></textarea>
        <small>0/1000</small>
    </div>
    `
}

export function investment(askFlexibility: boolean) {
    return html`
        <div class="form-page-06">
                <h1 class="briefing-title">Investimento</h1>
                <p class="briefing-subtitle">
                    Para alinharmos expectativas e construirmos o projeto ideal.
                </p>

                <fieldset class="briefing-input-box">
                    <legend>Qual a sua expectativa de investimento?</legend>
                    <small>Selecione uma faixa aproximada para o investimento total do projeto.</small>

                    <div class="briefing-select-box">
                        <label class="button-option"><input type="radio" name="investment-range" value="ate-250-mil"> <span>Até R$ 250 mil</span></label>
                        <label class="button-option"><input type="radio" name="investment-range" value="250-500-mil"> <span>R$ 250 a R$ 500 mil</span></label>
                        <label class="button-option"><input type="radio" name="investment-range" value="500-mil-1-milhao"> <span>R$ 500 mil a R$ 1 milhão</span></label>
                        <label class="button-option"><input type="radio" name="investment-range" value="acima-1-milhao"> <span>Acima de R$ 1 milhão</span></label>
                    </div>
                </fieldset>

                <div class="briefing-input-box">
                    <label>Valor máximo disponível (opcional)</label>
                    <small>Se preferir, informe um valor aproximado.</small>
                    <input
                        type="text"
                        class="briefing-input"
                        inputmode="decimal"
                        placeholder="Ex.: R$ 750.000,00"
                    >
                </div>

                <fieldset class="briefing-input-box">
                    <legend>O investimento inclui:</legend>
                    <small>Selecione os itens que você acha que devem estar cobertos pelo investimento.</small>

                    <div class="briefing-select-box briefing-investment-grid">
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="obra"> <span>Obra</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="marcenaria"> <span>Marcenaria</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="marmoraria"> <span>Marmoraria</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="revestimentos"> <span>Revestimentos</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="iluminacao"> <span>Iluminação</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="loucas-metais"> <span>Louças e metais</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="mobiliario"> <span>Mobiliário</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="eletrodomesticos"> <span>Eletrodomésticos</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="ar-condicionado"> <span>Ar-condicionado</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="cortinas-persianas"> <span>Cortinas e persianas</span></label>
                        <label class="button-option"><input type="checkbox" name="investment-includes" value="decoracao"> <span>Decoração</span></label>
                    </div>
                </fieldset>

               ${askFlexibility ? flexibility() : null}

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>
            </div>
    `
}
