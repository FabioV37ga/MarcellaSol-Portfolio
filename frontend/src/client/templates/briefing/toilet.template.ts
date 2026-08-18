import html from 'nanohtml'

export function toilet() {
    return html`
        <div class="form-page-16">

                <h1 class="briefing-title">Lavabo</h1>

                <p class="briefing-subtitle">
                    Conte-nos sobre este ambiente para que possamos<br>
                    planejar um lavabo funcional, acolhedor e alinhado ao seu estilo.
                </p>

                <div class="briefing-input-box">
                    <p>Quem utiliza este ambiente?</p>
                    <span>Selecione todas as opções que se aplicam.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="lavabo-users" value="moradores-da-casa">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Moradores da casa</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-users" value="visitas-hospedes">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Visitas / hóspedes</span>
                        </label>
                    </div>
                </div>

                <div class="briefing-input-box">
                    <p>O que precisa ser armazenado ou ter à disposição?</p>
                    <span>Selecione os itens que são importantes neste ambiente.</span>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="lavabo-storage" value="papel-higienico">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Papel higiênico</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-storage" value="sabonete">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Sabonete</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-storage" value="toalhas-de-rosto">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Toalhas de rosto</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-storage" value="produtos-de-reposicao">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Produtos de reposição</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-storage" value="itens-decorativos">
                            <div class="image-placeholder">Placeholder da imagem</div>
                            <span>Itens decorativos</span>
                        </label>

                        <label>
                            <input type="checkbox" name="lavabo-storage" value="outros">
                            <span>Outros</span>
                        </label>
                    </div>

                    <input
                        type="text"
                        class="briefing-input"
                        name="lavabo-storage-other"
                        placeholder="Especifique..."
                    >
                </div>

                <div class="briefing-input-box">
                    <p>Equipamentos, acabamentos ou desejos especiais</p>
                    <span>
                        Descreva equipamentos desejados, preferências estéticas<br>
                        ou qualquer detalhe importante para este ambiente.
                    </span>

                    <textarea
                        class="briefing-input-big"
                        maxlength="500"
                        placeholder="Ex.: espelho com iluminação, cuba esculpida, metais especiais, papel de parede, iluminação decorativa..."
                    ></textarea>
                    <small>0/500</small>
                </div>

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}