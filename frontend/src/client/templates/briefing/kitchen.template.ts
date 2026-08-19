import html from 'nanohtml'

function askResidentAmount(){
    return html`
         <div class="briefing-input-box">
                    <p>Mais de uma pessoa cozinha ao mesmo tempo?</p>

                    <div class="briefing-options briefing-kitchen-binary">
                        <label>
                            <input type="radio" name="form-input-88" value="sim">
                            <span>Sim</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-88" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </div>
    `
}

function askFastMeals(){
    return html`
         <div class="briefing-input-box">
                    <p>Vocês costumam fazer refeições rápidas na cozinha?</p>

                    <div class="briefing-options briefing-kitchen-binary">
                        <label>
                            <input type="radio" name="form-input-92" value="sim">
                            <span>Sim</span>
                        </label>

                        <label>
                            <input type="radio" name="form-input-92" value="nao">
                            <span>Não</span>
                        </label>
                    </div>
                </div>
    `
}

export function kitchen(residents: number, fastMeals: boolean){
    return html`
        <div class="form-page-12">

                <h1 class="briefing-title">Cozinha</h1>

                <p class="briefing-subtitle">
                    Queremos entender como vocês usam e sonham com esse ambiente.
                </p>

                <div class="briefing-input-row">
                    <div class="briefing-input-box">
                        <p>Qual a relação de vocês com a cozinha?</p>
                        <span>Ex.: adoramos cozinhar, cozinhamos por necessidade, etc.</span>

                        <select class="briefing-input" name="form-input-86">
                            <option value="" selected disabled>Selecione...</option>
                            <option value="adoramos-cozinhar">Adoramos cozinhar</option>
                            <option value="cozinhamos-com-frequencia">Cozinhamos com frequência</option>
                            <option value="cozinhamos-por-necessidade">Cozinhamos por necessidade</option>
                            <option value="raramente-cozinhamos">Raramente cozinhamos</option>
                        </select>
                    </div>

                    <div class="briefing-input-box">
                        <p>Com que frequência usam a cozinha?</p>

                        <select class="briefing-input" name="form-input-87">
                            <option value="" selected disabled>Selecione...</option>
                            <option value="todos-os-dias">Todos os dias</option>
                            <option value="algumas-vezes-por-semana">Algumas vezes por semana</option>
                            <option value="finais-de-semana">Apenas nos finais de semana</option>
                            <option value="raramente">Raramente</option>
                        </select>
                    </div>
                </div>

               ${residents > 1 ? askResidentAmount() : null}

                <div class="briefing-input-box">
                    <p>Quais eletrodomésticos são essenciais?</p>
                    <span>Selecione todos que se aplicam.</span>

                    <div class="briefing-options briefing-kitchen-appliances">
                        <label>
                            <input type="checkbox" name="form-input-89" value="geladeira">
                            <span>Geladeira</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="freezer">
                            <span>Freezer</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="forno">
                            <span>Forno</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="micro-ondas">
                            <span>Micro-ondas</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="cooktop">
                            <span>Cooktop</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="coifa">
                            <span>Coifa</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="lava-loucas">
                            <span>Lava-louças</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="adega-frigobar">
                            <span>Adega / Frigobar</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-89" value="outro">
                            <span>Outro</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        class="briefing-input"
                        data-briefing-other-for="form-input-89"
                        placeholder="Qual outro eletrodoméstico?"
                        hidden
                    >
                </div>

                <div class="briefing-input-box">
                    <p>Acessórios especiais desejados:</p>
                    <span>Selecione o que deseja ter na sua cozinha.</span>

                    <div class="briefing-options briefing-kitchen-accessories">
                        <label>
                            <input type="checkbox" name="form-input-90" value="triturador-de-alimentos">
                            <span>Triturador de alimentos na cuba</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-90" value="lixeira-embutida">
                            <span>Lixeira embutida</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-90" value="calha-umida">
                            <span>Calha úmida</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-90" value="dispenser-de-detergente">
                            <span>Dispenser de detergente embutido</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-90" value="torneira-com-filtro">
                            <span>Torneira com filtro</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-90" value="torres-tomadas-embutidas">
                            <span>Torres / tomadas embutidas</span>
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>O que precisa de mais armazenamento?</p>
                    <span>Ex.: panelas, mantimentos, louças, eletros, temperos, etc.</span>

                    <select class="briefing-input" name="form-input-91">
                        <option value="" selected disabled>Selecione...</option>
                        <option value="panelas">Panelas</option>
                        <option value="mantimentos">Mantimentos</option>
                        <option value="loucas">Louças</option>
                        <option value="eletrodomesticos">Eletrodomésticos</option>
                        <option value="temperos">Temperos</option>
                        <option value="outros">Outros</option>
                    </select>
                    <input
                        type="text"
                        class="briefing-input"
                        data-briefing-other-for="form-input-91"
                        placeholder="O que precisa de mais armazenamento?"
                        hidden
                    >
                </div>

                ${fastMeals ? askFastMeals() : null}

                <div class="briefing-input-box">
                    <p>Há algum hábito, problema ou desejo especial?</p>

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
