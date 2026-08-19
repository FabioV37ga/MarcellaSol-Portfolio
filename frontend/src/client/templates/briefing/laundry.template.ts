import html from 'nanohtml'

export function laundry() {
    return html`
        <div class="form-page-14">

                <h1 class="briefing-title">Área de Serviço</h1>

                <p class="briefing-subtitle">
                    Conte-nos como deve ser a área de serviço ideal para vocês.
                </p>

                <div class="briefing-input-box">
                    <p>1. Quais são as necessidades de armazenamento?</p>

                    <div class="briefing-options">
                        <label>
                            <input type="checkbox" name="form-input-100" value="produtos-de-limpeza">
                            <span>Produtos de limpeza</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-100" value="vassouras-utensilios">
                            <span>Vassouras e utensílios</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-100" value="cestos-para-roupas">
                            <span>Cestos para roupas</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-100" value="aspirador-de-po">
                            <span>Aspirador de pó</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-100" value="tabua-ferro-de-passar">
                            <span>Tábua e ferro de passar</span>
                        </label>

                        <label>
                            <input type="checkbox" name="form-input-100" value="outros">
                            <span>Outros</span>
                        </label>
                    </div>

                    <input
                        type="text"
                        class="briefing-input"
                        name="form-input-101"
                        data-briefing-other-for="form-input-100"
                        placeholder="Qual?"
                        hidden
                    >
                </div>

                <div class="briefing-input-box">
                    <p>2. Há algum hábito ou necessidade especial que devemos considerar?</p>

                    <textarea
                        class="briefing-input-big"
                        maxlength="300"
                        placeholder="Ex.: lavagem frequente de roupas delicadas, separação de brancas e coloridas, espaço para pet, entre outros."
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
