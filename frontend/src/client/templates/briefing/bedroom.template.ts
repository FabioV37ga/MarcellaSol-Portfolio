import html from 'nanohtml'


function userFunction() {
    return html`
        <div class="briefing-input-row">
             <p>1. Quem irá utilizar o quarto e qual sua principal função?</p>
            <div class="briefing-input-row">
                <div class="briefing-input-box">
                    <label>Quem utilizará o quarto?</label>
                    <select class="briefing-input" name="form-input-110">
                        <option value="" selected disabled>Selecione uma opção</option>
                        <option value="filho">Filho(a)</option>
                        <option value="hospedes">Hóspedes</option>
                        <option value="morador">Outro morador</option>
                        <option value="uso-compartilhado">Uso compartilhado</option>
                        <option value="outro">Outro</option>
                    </select>
                </div>
                <div class="briefing-input-box">
                    <label>Qual será a principal função do cômodo?</label>
                    <select class="briefing-input" name="form-input-111">
                        <option value="" selected disabled>Selecione uma opção</option>
                        <option value="dormitorio">Dormitório</option>
                        <option value="quarto-de-hospedes">Quarto de hóspedes</option>
                        <option value="escritorio">Escritório</option>
                        <option value="sala-intima">Sala íntima</option>
                        <option value="multiuso">Ambiente multiuso</option>
                        <option value="outro">Outro</option>
                </select>
            </div>
        </div>
    `
}

function routine() {
    return html`
        <div class="briefing-input-box">
            <p>2. Como deve funcionar no dia a dia?</p>

            <textarea
                class="briefing-input-big"
                maxlength="300"
                placeholder="Ex.: quarto para visitas ocasionais, home office para trabalho em tempo integral, quarto infantil para estudo e brincadeiras."
            ></textarea>
            <small>0/300</small>
        </div>
    `
}

function specifics(askBed: boolean,
    askTV: boolean,
    askReading: boolean,
    askHomeoffice: boolean,
    askHair: boolean,
    askShelf: boolean,
    askWardrobe: boolean,
    askWorkdesk: boolean
) {
    return html`
        <div class="briefing-input-box">
                <p>3. O que não pode faltar no quarto?</p>
                <div class="briefing-options">

                    ${askBed ? bed() : null}
                    ${askTV ? TV() : null}
                    ${askReading ? reading() : null}
                    ${askHomeoffice ? homeoffice() : null}
                    ${askHair ? hair() : null}
                    ${askShelf ? shelf() : null}
                    ${askWardrobe ? wardrobe : null}
                    ${askWorkdesk ? workdesk() : null}

                <label>
                    <input type="checkbox" name="form-input-103" value="outros">
                    <div class="image-placeholder">Placeholder da imagem</div>
                    <span>Outros</span>
                </label>
                </div>

                ${askBed ? bedList() : null}
        </div>
    `
}

function bed() {
    return html`
        <label>
            <input type="checkbox" name="form-input-103" value="cama">
            <div class="image-placeholder">Placeholder da imagem</div>
            <span>Cama (qual tipo?)</span>
        </label>
    `
}

function TV() {
    return html`
        <label>
            <input type="checkbox" name="form-input-103" value="tv">
            <div class="image-placeholder">Placeholder da imagem</div>
            <span>TV</span>
        </label>
    `
}

function reading() {
    return html`
     <label>
        <input type="checkbox" name="form-input-103" value="espaco-para-leitura">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Espaço para leitura</span>
    </label>
    
    `
}

function homeoffice() {
    return html`
    <label>
        <input type="checkbox" name="form-input-103" value="home-office">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Home office</span>
    </label>
    `
}


function hair() {
    return html`
    <label>
        <input type="checkbox" name="form-input-103" value="penteadeira-camarim">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Penteadeira / camarim</span>
    </label>
    `
}

function shelf() {
    return html`
    <label>
        <input type="checkbox" name="form-input-103" value="estante-prateleiras">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Estante / prateleiras</span>
    </label>
    `
}

function wardrobe() {
    return html`
    <label>
        <input type="checkbox" name="form-input-103" value="guarda-roupa">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Guarda-roupa</span>
    </label>
    `
}

function workdesk() {
    return html`
    <label>
        <input type="checkbox" name="form-input-103" value="mesa-trabalho-estudo">
        <div class="image-placeholder">Placeholder da imagem</div>
        <span>Mesa de trabalho / estudo</span>
    </label>
    `
}

function bedList() {
    return html`
        <select class="briefing-input" name="form-input-104">
        <option value="" selected disabled>Selecione o tipo de cama</option>
        <option value="berco">Berço</option>
        <option value="montessoriano">Montessoriano</option>
        <option value="solteiro">Solteiro</option>
        <option value="viuva">Viúva</option>
        <option value="casal">Casal</option>
        <option value="queen">Queen</option>
        <option value="king">King</option>
    </select>

    <input
        type="text"
        class="briefing-input"
        name="form-input-113"
        placeholder="Qual outro item?"
    >
    `
}

function clothes() {
    return html`
    <div class="briefing-input-box">
        <p>4. Quantidade aproximada de roupas e acessórios</p>

        <select class="briefing-input" name="form-input-105">
            <option value="" selected disabled>Selecione uma opção</option>
            <option value="pequena">Pequena</option>
            <option value="media">Média</option>
            <option value="grande">Grande</option>
            <option value="muito-grande">Muito grande</option>
        </select>
    </div>        
    `
}

function storagePreference() {
    return html`
    <div class="briefing-input-box">
        <p>5. O que precisa de mais espaço/armazenamento?</p>

        <div class="briefing-options">
            <label>
                <input type="checkbox" name="form-input-106" value="roupas-longas">
                <span>Roupas longas</span>
            </label>

            <label>
                <input type="checkbox" name="form-input-106" value="roupas-de-cama-banho">
                <span>Roupas de cama e banho</span>
            </label>

            <label>
                <input type="checkbox" name="form-input-106" value="sapatos">
                <span>Sapatos</span>
            </label>

            <label>
                <input type="checkbox" name="form-input-106" value="malas">
                <span>Malas</span>
            </label>

            <label>
                <input type="checkbox" name="form-input-106" value="bolsas-acessorios">
                <span>Bolsas e acessórios</span>
            </label>

            <label>
                <input type="checkbox" name="form-input-106" value="outros">
                <span>Outros</span>
            </label>
        </div>

        <input
            type="text"
            class="briefing-input"
            name="form-input-107"
            placeholder="Qual?"
        >
    </div>
    `
}

function balance() {
    return html`
     <div class="briefing-input-box">
        <p>6. Como preferem o equilíbrio entre armazenamento e leveza visual?</p>

        <input
            type="range"
            class="briefing-range"
            name="form-input-108"
            min="0"
            max="100"
            value="50"
        >

        <div class="briefing-range-labels">
            <span>Mais armazenamento</span>
            <span>Equilíbrio</span>
            <span>Mais leveza visual</span>
        </div>
    </div>
    `
}

function needs(){
    return html`
    <div class="briefing-input-box">
        <p>7. Existe algum desejo especial para o quarto?</p>

        <textarea
            class="briefing-input-big"
            maxlength="300"
            placeholder="Ex.: closet fechado, cabeceira estofada, iluminação indireta, espelho de corpo inteiro, entre outros."
        ></textarea>
        <small>0/300</small>
    </div>
    `
}

export function bedroom(
    askUserFunction: boolean,
    askRoutine: boolean,
    askSpecifics: boolean,
    askBed: boolean,
    askTV: boolean,
    askReading: boolean,
    askHomeOffice: boolean,
    askHair: boolean,
    askShelf: boolean,
    askWardrobe: boolean,
    askWorkdesk: boolean,
    askClothesAmount: boolean,
    askStoragePreference: boolean,
    askBalance: boolean,
    askNeeds: boolean
) {

    return html`
            <div class="form-page-15">

                <h1 class="briefing-title">Quarto</h1>
                
                <p class="briefing-subtitle">
                Vamos planejar este ambiente com todo o cuidado e entender como deve ser o quarto ideal para vocês.
                </p>
        
                ${askUserFunction ? userFunction() : null}
                

                ${askRoutine ? routine() : null}

                ${askSpecifics ? specifics(askBed, askTV, askReading, askHomeOffice, askHair, askShelf, askWardrobe, askWorkdesk) : null}

                ${askClothesAmount ? clothes() : null}

                ${askStoragePreference ? storagePreference() : null}

                ${askBalance ? balance() : null}

                ${askNeeds ? needs() : null}

                <div class="briefing-navigation">
                    <a>← Voltar</a>
                    <a>Continuar →</a>
                </div>

            </div>
    `
}