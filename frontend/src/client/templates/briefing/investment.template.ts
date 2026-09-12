import html from 'nanohtml'
import { briefingButtonOptions } from './components/briefing-options.template.js'

const investmentRanges = [
    { value: "ate-250-mil", label: "Até R$ 250 mil" },
    { value: "250-500-mil", label: "R$ 250 a R$ 500 mil" },
    { value: "500-mil-1-milhao", label: "R$ 500 mil a R$ 1 milhão" },
    { value: "acima-1-milhao", label: "Acima de R$ 1 milhão" }
];

const includedInvestmentItems = [
    { value: "obra", label: "Obra" },
    { value: "marcenaria", label: "Marcenaria" },
    { value: "marmoraria", label: "Marmoraria" },
    { value: "revestimentos", label: "Revestimentos" },
    { value: "iluminacao", label: "Iluminação" },
    { value: "loucas-metais", label: "Louças e metais" },
    { value: "mobiliario", label: "Mobiliário" },
    { value: "eletrodomesticos", label: "Eletrodomésticos" },
    { value: "ar-condicionado", label: "Ar-condicionado" },
    { value: "cortinas-persianas", label: "Cortinas e persianas" },
    { value: "decoracao", label: "Decoração" }
];

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
                        ${briefingButtonOptions("radio", "investment-range", investmentRanges)}
                    </div>
                </fieldset>

                <div class="briefing-input-box">
                    <label>Valor máximo disponível (opcional)</label>
                    <small>Se preferir, informe um valor aproximado.</small>
                    <input
                        type="number"
                        class="briefing-input"
                        inputmode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Ex.: 750000"
                    >
                </div>

                <fieldset class="briefing-input-box">
                    <legend>O investimento inclui:</legend>
                    <small>Selecione os itens que você acha que devem estar cobertos pelo investimento.</small>

                    <div class="briefing-select-box briefing-investment-grid">
                        ${briefingButtonOptions("checkbox", "investment-includes", includedInvestmentItems)}
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
