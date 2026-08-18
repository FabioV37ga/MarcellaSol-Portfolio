import html from 'nanohtml'

function askBalconyIntegration(){
    return html`
        <div class="briefing-input-box">
                    <p>Desejam integrar a varanda na sala?</p>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-96" value="integracao-total">
                            <span>Sim, integração total</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-96" value="integracao-parcial">
                            <span>Sim, integração parcial</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-96" value="manter-separada">
                            <span>Não, manter separada</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-96" value="ainda-nao-sabemos">
                            <span>Ainda não sabemos</span>
                        </label>
                    </div>
                </div>
    `
}

export function balcony(askBalcony: boolean){
    return html`
        <div class="form-page-13">

                <h1 class="briefing-title">Varanda</h1>

                <p class="briefing-subtitle">
                    Vamos entender como vocês desejam usar esse espaço.
                </p>

                <div class="briefing-input-box">
                    <p>Quais usos vocês pretendem para a varanda?</p>
                    <span>Pode selecionar mais de uma opção.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-94" value="estar-descanso">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Estar / descanso</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="refeicoes">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Refeições</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="churrasco-gourmet">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Churrasco / gourmet</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="jardim-plantas">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Jardim / plantas</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="trabalho-home-office">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Trabalho / home office</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="leitura">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Leitura</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="lazer-jogos">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Lazer / jogos</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="apoio-multiuso">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Apoio / multiuso</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-94" value="outro">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Outro</span>
                            <input
                                type="text"
                                class="briefing-input"
                                placeholder="Qual outro uso?"
                            >
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Desejam realizar o envidraçamento da sacada?</p>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-95" value="sim">
                            <span>Sim</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-95" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </div>

                ${askBalcony ? askBalconyIntegration() : null}

                <div class="briefing-input-box">
                    <p>Há alguma necessidade ou desejo especial?</p>

                    <textarea
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