import html from 'nanohtml'

type Equipment = {
    label: string
    placeholder: string
    voltageName: string
    allowNotApplicable?: boolean
}

function voltageSelect(name: string, allowNotApplicable = false) {
    return html`
        <select class="briefing-input" name="${name}" required>
            <option value="" selected disabled>Selecione a voltagem</option>
            <option value="110v">110 V</option>
            <option value="220v">220 V</option>
            <option value="bivolt">Bivolt</option>
            ${allowNotApplicable ? html`<option value="nao-se-aplica">Não se aplica</option>` : ''}
            <option value="a-definir">Ainda não sabemos</option>
        </select>
    `
}

function equipmentFields(equipment: Equipment[]) {
    return equipment.map(item => html`
        <div class="briefing-input-box">
            <label>${item.label}</label>
            <input type="text" class="briefing-input" placeholder="${item.placeholder}" required>
            ${voltageSelect(item.voltageName, item.allowNotApplicable)}
        </div>
    `)
}

function otherItem(placeholder = 'Coloque o link ou descreva aqui') {
    return html`
        <div class="briefing-input-box">
            <label>Algum outro item?</label>
            <textarea class="briefing-input-medium" maxlength="500" placeholder="${placeholder}"></textarea>
            <small>0/500</small>
        </div>
    `
}

function photoUpload(title: string, description: string) {
    return html`
        <div class="briefing-input-box">
            <label>${title}</label>
            <small>${description}</small>
            <div class="briefing-file-upload">
                <p>Clique para enviar ou arraste os arquivos aqui.</p>
                <small>Até 10 imagens JPG, PNG ou WebP, com no máximo 10 MB cada.</small>
                <input type="file" class="briefing-input" accept="image/jpeg,image/png,image/webp" multiple>
                <label class="button-option">Adicionar fotos</label>
            </div>
        </div>
    `
}

function navigation() {
    return html`
        <div class="briefing-navigation">
            <a>← Voltar</a>
            <a>Continuar →</a>
        </div>
    `
}

function existingKitchen() {
    const equipment: Equipment[] = [
        { label: 'Geladeira', placeholder: 'Informe modelo, medidas ou link', voltageName: 'geladeira-voltagem' },
        { label: 'Fogão de piso ou cooktop', placeholder: 'Informe o tipo, modelo, medidas ou link', voltageName: 'fogao-cooktop-voltagem', allowNotApplicable: true },
        { label: 'Forno de embutir', placeholder: 'Informe modelo, medidas ou link', voltageName: 'forno-voltagem', allowNotApplicable: true },
        { label: 'Depurador ou coifa', placeholder: 'Informe o tipo, modelo, medidas ou link', voltageName: 'depurador-coifa-voltagem' },
        { label: 'Micro-ondas', placeholder: 'Informe modelo, medidas ou link', voltageName: 'micro-ondas-voltagem' },
        { label: 'Lava-louças', placeholder: 'Informe modelo, medidas ou link', voltageName: 'lava-loucas-voltagem' },
        { label: 'Filtro de água', placeholder: 'Informe modelo, medidas ou link', voltageName: 'filtro-agua-voltagem', allowNotApplicable: true }
    ]

    return html`
        <div class="form-page-19">
            <h1 class="briefing-title">Cozinha</h1>
            <p class="briefing-subtitle">Informe os equipamentos que precisam ser considerados no projeto.</p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Equipamentos</h2>
                ${equipmentFields(equipment)}
                ${otherItem()}
                ${photoUpload('Fotos da cozinha', 'Envie fotos do ambiente e dos equipamentos que devem ser considerados.')}
            </section>

            ${navigation()}
        </div>
    `
}

function existingLaundry() {
    return html`
        <div class="form-page-20">
            <h1 class="briefing-title">Área de serviço</h1>
            <p class="briefing-subtitle">Informe os equipamentos que precisam ser considerados no projeto.</p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Equipamentos</h2>

                <div class="briefing-input-box">
                    <label>Máquina de lavar roupas</label>
                    <select class="briefing-input" required>
                        <option value="" selected disabled>Selecione o tipo</option>
                        <option value="lava-e-seca">Lava e seca</option>
                        <option value="convencional">Convencional</option>
                    </select>
                </div>

                <div class="briefing-input-box">
                    <label>Modelo, medidas ou link da máquina</label>
                    <input type="text" class="briefing-input" placeholder="Informe modelo, medidas ou link">
                    ${voltageSelect('maquina-lavar-voltagem')}
                </div>

                ${otherItem()}
                ${photoUpload('Fotos da área de serviço', 'Envie fotos do ambiente e dos equipamentos que devem ser considerados.')}
            </section>

            ${navigation()}
        </div>
    `
}

function existingLivingRoom() {
    const equipment: Equipment[] = [
        { label: 'TV', placeholder: 'Informe modelo, medidas ou link', voltageName: 'tv-voltagem' },
        { label: 'Aparelhos de internet ou TV a cabo', placeholder: 'Informe os aparelhos, medidas ou links', voltageName: 'internet-tv-cabo-voltagem' },
        { label: 'Aparelhos de som', placeholder: 'Informe os aparelhos, medidas ou links', voltageName: 'som-voltagem' },
        { label: 'Videogame', placeholder: 'Informe o modelo, medidas ou link', voltageName: 'videogame-voltagem' }
    ]

    return html`
        <div class="form-page-21">
            <h1 class="briefing-title">Sala</h1>
            <p class="briefing-subtitle">Informe os equipamentos que precisam ser considerados no projeto.</p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Equipamentos</h2>
                ${equipmentFields(equipment)}

                <div class="briefing-input-box">
                    <label>Fechadura digital</label>
                    <input type="text" class="briefing-input" placeholder="Informe o modelo ou link" required>
                </div>

                ${otherItem()}
                ${photoUpload('Fotos da sala', 'Envie fotos do ambiente e dos equipamentos que devem ser considerados.')}
            </section>

            ${navigation()}
        </div>
    `
}

function existingGourmetBalcony() {
    const equipment: Equipment[] = [
        { label: 'Cervejeira', placeholder: 'Informe modelo, medidas ou link', voltageName: 'cervejeira-voltagem' },
        { label: 'Chopeira', placeholder: 'Informe modelo, medidas ou link', voltageName: 'chopeira-voltagem' },
        { label: 'Adega climatizada', placeholder: 'Informe modelo, medidas ou link', voltageName: 'adega-voltagem' },
        { label: 'Churrasqueira', placeholder: 'Informe o tipo, modelo, medidas ou link', voltageName: 'churrasqueira-voltagem', allowNotApplicable: true },
        { label: 'TV', placeholder: 'Informe modelo, medidas ou link', voltageName: 'tv-voltagem' }
    ]

    return html`
        <div class="form-page-22">
            <h1 class="briefing-title">Varanda gourmet</h1>
            <p class="briefing-subtitle">Informe os equipamentos que precisam ser considerados no projeto.</p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Equipamentos</h2>
                ${equipmentFields(equipment)}
                ${otherItem()}
                ${photoUpload('Fotos da varanda gourmet', 'Envie fotos do ambiente e dos equipamentos que devem ser considerados.')}
            </section>

            ${navigation()}
        </div>
    `
}

function existingDormitories() {
    const equipment: Equipment[] = [
        { label: 'TV', placeholder: 'Informe o dormitório, modelo, medidas ou link', voltageName: 'tv-voltagem' },
        { label: 'Computador (CPU, monitor ou notebook)', placeholder: 'Informe o dormitório, equipamentos, medidas ou links', voltageName: 'computador-voltagem' },
        { label: 'Impressora', placeholder: 'Informe o dormitório, modelo, medidas ou link', voltageName: 'impressora-voltagem' },
        { label: 'Frigobar', placeholder: 'Informe o dormitório, modelo, medidas ou link', voltageName: 'frigobar-voltagem' },
        { label: 'Aparelhos de TV a cabo ou internet', placeholder: 'Informe o dormitório, aparelhos, medidas ou links', voltageName: 'internet-tv-cabo-voltagem' },
        { label: 'Videogame', placeholder: 'Informe o dormitório, modelo, medidas ou link', voltageName: 'videogame-voltagem' }
    ]

    return html`
        <div class="form-page-23">
            <h1 class="briefing-title">Dormitórios</h1>
            <p class="briefing-subtitle">Identifique o dormitório e informe os equipamentos que precisam ser considerados.</p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Equipamentos</h2>
                ${equipmentFields(equipment)}
                ${otherItem('Informe o dormitório e coloque o link ou descreva aqui')}
                ${photoUpload('Fotos dos dormitórios', 'Identifique o dormitório e envie fotos dos ambientes e equipamentos.')}
            </section>

            ${navigation()}
        </div>
    `
}

function existingFurniture() {
    return html`
        <div class="form-page-24">
            <h1 class="briefing-title">Móveis a serem mantidos no projeto</h1>
            <p class="briefing-subtitle">
                Liste os móveis, todas as medidas e os ambientes em que gostaria de mantê-los.
                Caso não existam móveis a serem mantidos, responda apenas “Não consta”.
            </p>

            <section class="briefing-section">
                <h2 class="briefing-section-title">Móveis existentes</h2>

                <div class="briefing-input-box">
                    <label>Móveis, medidas e ambientes</label>
                    <textarea
                        class="briefing-input-big"
                        maxlength="1500"
                        placeholder="Ex.: sofá de 2,20 × 0,90 m — manter na sala de estar."
                        required
                    ></textarea>
                    <small>0/1500</small>
                </div>

                ${photoUpload('Coloque as fotos dos móveis', 'Faça upload de até 10 arquivos. O tamanho máximo é de 10 MB por item.')}
            </section>

            ${navigation()}
        </div>
    `
}

export const existing = {
    existingKitchen,
    existingLaundry,
    existingLivingRoom,
    existingGourmetBalcony,
    existingDormitories,
    existingFurniture
}
