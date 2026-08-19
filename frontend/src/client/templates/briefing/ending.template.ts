import html from 'nanohtml'

export function ending(){
    return html`
        <div class="form-page-18">

                <h1 class="briefing-title">Finalizar</h1>

                <p class="briefing-subtitle">
                    Revise as informações do seu briefing. Você pode editar<br>
                    qualquer etapa antes de enviar.
                </p>

                <div class="briefing-summary">
                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/sobre-imovel.png" alt="">
                        <div>
                            <h2>Sobre vocês e o imóvel</h2>
                            <p>Casa&nbsp; • &nbsp;3 moradores&nbsp; • &nbsp;São Paulo, SP</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>

                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/rotina.png" alt="">
                        <div>
                            <h2>Rotina</h2>
                            <p>Manhã prática&nbsp; • &nbsp;Home office&nbsp; • &nbsp;Recebem amigos com frequência</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>

                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/projeto.png" alt="">
                        <div>
                            <h2>Projeto</h2>
                            <p>Reforma parcial&nbsp; • &nbsp;Cozinha integrada&nbsp; • &nbsp;Estilo contemporâneo</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>

                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/investimento.png" alt="">
                        <div>
                            <h2>Investimento</h2>
                            <p>Faixa de investimento: R$ 120.000 – R$ 150.000</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>

                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/preferencias.png" alt="">
                        <div>
                            <h2>Preferências</h2>
                            <p>Cores neutras&nbsp; • &nbsp;Madeira clara&nbsp; • &nbsp;Iluminação quente</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>

                    <section class="briefing-summary-item">
                        <img class="briefing-summary-icon" src="/images/briefing/summary/ambientes.png" alt="">
                        <div>
                            <h2>Ambientes</h2>
                            <p>9 ambientes informados</p>
                        </div>
                        <button type="button" class="briefing-edit-button">Editar</button>
                    </section>
                </div>

                <div class="briefing-input-box">
                    <p>Observações finais (opcional)</p>
                    <span>Conte algo importante que não foi abordado nas etapas anteriores.</span>

                    <textarea class="briefing-input-big" maxlength="500"
                        placeholder="Ex.: prazos desejados, restrições, referências, inspirações..."></textarea>
                    <small>0/500</small>
                </div>

                <div class="briefing-input-box">
                    <label>O que esperam que esteja diferente?</label>
                    <textarea class="briefing-input-medium" maxlength="200"
                        placeholder="Como vocês imaginam a mudança ideal no dia a dia da casa?"></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-input-box">
                    <label>O que esperam no final do projeto?</label>
                    <textarea class="briefing-input-medium" maxlength="200"
                        placeholder="Como vocês imaginam a mudança ideal no dia a dia da casa?"></textarea>
                    <small>0/200</small>
                </div>


                <div class="briefing-confirmation">
                    <label>
                        <input type="checkbox" name="form-input-119" value="confirmado" required>
                        <span>Confirmo que as informações acima estão corretas e completas.</span>
                    </label>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <button type="submit">Enviar briefing →</button>
                </div>

                <div class="briefing-success-message" hidden>
                    <img class="briefing-success-icon" src="/images/briefing/summary/sucesso.png" alt="">
                    <div>
                        <strong>Obrigada por confiar em nós!</strong>
                        <p>Seu briefing foi enviado e nossa equipe entrará em contato em breve.</p>
                    </div>
                </div>

            </div>
    `
}
