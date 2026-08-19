import html from 'nanohtml'

export function routine(){
    return html`
        <div class="form-page-03">
                <h1 class="briefing-title">Rotina</h1>
                <p class="briefing-subtitle">
                    Vamos entender melhor como vocês vivem no dia a dia.<br>
                    Essas informações nos ajudam a criar ambientes que fazem sentido para a sua rotina e para o que
                    realmente importa.
                </p>

                <div class="briefing-input-box">
                    <p>Como costuma ser a rotina da semana?</p>
                    <textarea
                        class="briefing-input-big"
                        maxlength="300"
                        placeholder="Conte como são os dias de semana e os finais de semana na sua casa."
                    ></textarea>
                    <small>0/300</small>
                </div>

                <div class="briefing-input-box">
                    <p>Com que frequência vocês recebem visitas?</p>
                    <select class="briefing-input">
                        <option value="" selected disabled>Selecione uma opção</option>
                        <option value="raramente">Raramente</option>
                        <option value="ocasionalmente">Ocasionalmente</option>
                        <option value="frequentemente">Frequentemente</option>
                        <option value="muito-frequentemente">Muito frequentemente</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <p>Quantas pessoas normalmente recebem?</p>
                    <select class="briefing-input">
                        <option value="" selected disabled>Selecione uma opção</option>
                        <option value="1-2">1 a 2 pessoas</option>
                        <option value="3-5">3 a 5 pessoas</option>
                        <option value="6-10">6 a 10 pessoas</option>
                        <option value="mais-de-10">Mais de 10 pessoas</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <p>Quais atividades vocês mais gostam de fazer em casa?</p>
                    <textarea
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Ex.: assistir filmes, cozinhar, receber amigos, trabalhar, ler..."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-input-box">
                    <p>Hobbies e interesses</p>
                    <textarea
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Conte sobre hobbies, coleções ou paixões que fazem parte do dia a dia."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-input-box">
                    <p>Alguma particularidade importante que devemos saber?</p>
                    <textarea
                        data-briefing-optional
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Ex.: crianças pequenas, pets, cuidados especiais, horários de silêncio, etc."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <fieldset class="briefing-input-box">
                    <legend>Três prioridades do projeto, em ordem de importância</legend>

                    <div class="briefing-input-row">
                        <label>1ª prioridade</label>
                        <select class="briefing-input">
                            <option value="" selected disabled>Selecione uma opção</option>
                            <option value="conforto">Conforto</option>
                            <option value="organizacao">Organização</option>
                            <option value="praticidade">Praticidade</option>
                            <option value="armazenamento">Armazenamento</option>
                            <option value="integracao">Integração</option>
                            <option value="privacidade">Privacidade</option>
                            <option value="iluminacao">Iluminação</option>
                            <option value="estetica">Estética</option>
                        </select>
                    </div>

                    <div class="briefing-input-row">
                        <label>2ª prioridade</label>
                        <select class="briefing-input">
                            <option value="" selected disabled>Selecione uma opção</option>
                            <option value="conforto">Conforto</option>
                            <option value="organizacao">Organização</option>
                            <option value="praticidade">Praticidade</option>
                            <option value="armazenamento">Armazenamento</option>
                            <option value="integracao">Integração</option>
                            <option value="privacidade">Privacidade</option>
                            <option value="iluminacao">Iluminação</option>
                            <option value="estetica">Estética</option>
                        </select>
                    </div>

                    <div class="briefing-input-row">
                        <label>3ª prioridade</label>
                        <select class="briefing-input">
                            <option value="" selected disabled>Selecione uma opção</option>
                            <option value="conforto">Conforto</option>
                            <option value="organizacao">Organização</option>
                            <option value="praticidade">Praticidade</option>
                            <option value="armazenamento">Armazenamento</option>
                            <option value="integracao">Integração</option>
                            <option value="privacidade">Privacidade</option>
                            <option value="iluminacao">Iluminação</option>
                            <option value="estetica">Estética</option>
                        </select>
                    </div>
                </fieldset>

                <fieldset class="briefing-input-box" data-max-selections="5">
                    <legend>Principais prioridades</legend>
                    <small>Selecione até 5 opções.</small>

                    <div class="briefing-select-box">
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="conforto"> <span>Conforto</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="organizacao"> <span>Organização</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="praticidade"> <span>Praticidade</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="armazenamento"> <span>Armazenamento</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="integracao"> <span>Integração</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="privacidade"> <span>Privacidade</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="iluminacao"> <span>Iluminação</span></label>
                        <label class="button-option"><input type="checkbox" name="main-priorities" value="estetica"> <span>Estética</span></label>
                    </div>
                </fieldset>

                <div class="briefing-input-box">
                    <label>O que mais incomoda hoje na sua casa?</label>
                    <textarea
                        class="briefing-input-medium"
                        maxlength="200"
                        placeholder="Conte sobre os principais incômodos e dificuldades que vocês enfrentam atualmente."
                    ></textarea>
                    <small>0/200</small>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}
