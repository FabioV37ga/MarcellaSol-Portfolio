import html from 'nanohtml'

function askBalconyIntegration(){
    return html`
        <div class="briefing-input-box">
                    <p>Desejam integrar a varanda na sala?</p>

                    <div class="briefing-options briefing-balcony-integration">
                        <label>
                            <input type="radio" name="form-input-96" value="integracao-total">
                            <span>Sim, integração total</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-96" value="integracao-parcial">
                            <span>Sim, integração parcial</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-96" value="manter-separada">
                            <span>Não, manter separada</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-96" value="ainda-nao-sabemos">
                            <span>Ainda não sabemos</span>
                        </label>
                    </div>
                </div>
    `
}

export function balcony(_askBalcony: boolean){
    return html`
        <div class="form-page-13">

                <h1 class="briefing-title">Varanda</h1>

                <p class="briefing-subtitle">
                    Vamos entender como vocês desejam usar esse espaço.
                </p>

                <div class="briefing-input-box">
                    <p>Quais usos vocês pretendem para a varanda?</p>
                    <span>Pode selecionar mais de uma opção.</span>

                    <div class="briefing-options briefing-balcony-uses">
                        <label>
                            <input type="checkbox" name="form-input-94" value="estar-descanso">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/estar-descanso.png" alt="">
                            <span>Estar / descanso</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="refeicoes">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/refeicoes.png" alt="">
                            <span>Refeições</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="churrasco-gourmet">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/churrasco-gourmet.png" alt="">
                            <span>Churrasco / gourmet</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="jardim-plantas">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/jardim-plantas.png" alt="">
                            <span>Jardim / plantas</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="trabalho-home-office">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/trabalho-home-office.png" alt="">
                            <span>Trabalho / home office</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="leitura">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/leitura.png" alt="">
                            <span>Leitura</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="lazer-jogos">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/lazer-jogos.png" alt="">
                            <span>Lazer / jogos</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="apoio-multiuso">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/apoio-multiuso.png" alt="">
                            <span>Apoio / multiuso</span>
                        </label>

                        <label class="briefing-balcony-other">
                            <input type="checkbox" name="form-input-94" value="outro">
                            <img class="briefing-balcony-icon" src="/images/briefing/balcony/outro.png" alt="">
                            <span>Outro</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        class="briefing-input"
                        data-briefing-other-for="form-input-94"
                        placeholder="Qual outro uso?"
                        hidden
                    >
                </div>

                <div class="briefing-input-box">
                    <p>Desejam realizar o envidraçamento da sacada?</p>

                    <div class="briefing-options briefing-balcony-glazing">
                        <label>
                            <input type="radio" name="form-input-95" value="sim">
                            <span>Sim</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-95" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </div>

                ${askBalconyIntegration()}

                <div class="briefing-input-box">
                    <p>Há alguma necessidade ou desejo especial?</p>

                    <textarea
                        data-briefing-optional
                        class="briefing-input-big"
                        maxlength="400"
                        placeholder="Conte para a gente..."
                    ></textarea>
                    <small>0/400</small>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}
