import html from 'nanohtml'

export function diningRoom(){
    return html`
        <div class="form-page-11">

                <h1 class="briefing-title">Sala de jantar</h1>

                <p class="briefing-subtitle">
                    Conte-nos como vocês usam esse ambiente.
                </p>

                <div class="briefing-input-box">
                    <p>Quantas pessoas usam a mesa normalmente?</p>
                    <span>No dia a dia.</span>

                    <select class="briefing-input" name="form-input-82">
                        <option value="" selected disabled>Selecione...</option>
                        <option value="1">1 pessoa</option>
                        <option value="2">2 pessoas</option>
                        <option value="3">3 pessoas</option>
                        <option value="4">4 pessoas</option>
                        <option value="5">5 pessoas</option>
                        <option value="6">6 pessoas</option>
                        <option value="7-ou-mais">7 pessoas ou mais</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <p>Quantas pessoas vocês gostariam de acomodar?</p>
                    <span>Em ocasiões especiais.</span>

                    <select class="briefing-input" name="form-input-83">
                        <option value="" selected disabled>Selecione...</option>
                        <option value="2">2 pessoas</option>
                        <option value="4">4 pessoas</option>
                        <option value="6">6 pessoas</option>
                        <option value="8">8 pessoas</option>
                        <option value="10">10 pessoas</option>
                        <option value="12-ou-mais">12 pessoas ou mais</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <p>A mesa também é usada para trabalho/estudo/jogos/apoio?</p>
                    <span>Pode selecionar mais de uma opção.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-84" value="trabalho">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Trabalho</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-84" value="estudo">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Estudo</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-84" value="jogos">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Jogos</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-84" value="apoio-tarefas-do-dia-a-dia">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Apoio / tarefas do dia a dia</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-84" value="apenas-refeicoes">
                            <span>Não, apenas para refeições</span>
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Há alguma necessidade de armazenamento ou desejo especial?</p>
                    <span>Ex.: louceiro, buffet, adega, cristaleira, aparador, etc.</span>

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