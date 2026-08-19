import html from 'nanohtml'

export function livingRoom(){
    return html`
        <div class="form-page-10">

                <a class="back-to-environments">← Voltar para ambientes</a>

                <h1 class="briefing-title">Sala de estar</h1>

                <p class="briefing-subtitle">
                    Conte como vocês usam este ambiente no dia a dia.
                </p>

                <div class="briefing-input-box">
                    <p>Como vocês usam a sala de estar?</p>
                    <span>Selecione todas que se aplicam.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-77" value="assistir-tv-filmes">
                            <span>Assistir TV / filmes</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-77" value="receber-visitas">
                            <span>Receber visitas</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-77" value="descansar-relaxar">
                            <span>Descansar / relaxar</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-77" value="trabalhar-estudar">
                            <span>Trabalhar / estudar</span>
                        </label>

                        <label class="briefing-other-option">
                            <input type="checkbox" name="form-input-77" value="outros">
                            <span>Outros</span>
                        </label>
                    </div>

                    <div data-briefing-other-for="form-input-77" hidden>
                        <textarea
                            class="briefing-input-medium briefing-other-input"
                            maxlength="200"
                            placeholder="Conte como usam este ambiente"
                        ></textarea>
                        <small>0/200</small>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Quantas pessoas precisam sentar confortavelmente no dia a dia?</p>
                    <span>Considere a rotina da casa, não apenas eventos.</span>

                    <select class="briefing-input" name="form-input-79">
                        <option value="" selected disabled>Selecione</option>
                        <option value="1">1 pessoa</option>
                        <option value="2">2 pessoas</option>
                        <option value="3">3 pessoas</option>
                        <option value="4">4 pessoas</option>
                        <option value="5">5 pessoas</option>
                        <option value="6-ou-mais">6 pessoas ou mais</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <p>Quais elementos precisam ser considerados na sala de estar?</p>
                    <span>Selecione todas que se aplicam.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-80" value="sofa">
                            <span>Sofá</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-80" value="poltronas-cadeiras">
                            <span>Poltronas / cadeiras</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-80" value="estante-marcenaria">
                            <span>Estante / marcenaria</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-80" value="tv-home-theater">
                            <span>TV / home theater</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-80" value="mesa-de-centro">
                            <span>Mesa de centro</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-80" value="iluminacao">
                            <span>Iluminação</span>
                        </label>

                    </div>

                    <div class="briefing-other-row">
                        <label>
                            <input type="checkbox" name="form-input-80" value="outros">
                            <span>Outros</span>
                        </label>
                        <div class="briefing-other-field" data-briefing-other-for="form-input-80" hidden>
                            <textarea
                                class="briefing-input-medium briefing-other-input"
                                maxlength="200"
                                placeholder="Conte outros elementos importantes"
                            ></textarea>
                            <small>0/200</small>
                        </div>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>Desejos ou necessidades especiais</p>
                    <span>Alguma necessidade específica que devemos considerar?</span>

                    <textarea
                        data-briefing-optional
                        class="briefing-input-big"
                        maxlength="300"
                        placeholder="Ex.: espaço para obras de arte, som ambiente, cantinho para leitura..."
                    ></textarea>
                    <small>0/300</small>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}
