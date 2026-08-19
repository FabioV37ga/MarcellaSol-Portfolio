import html from "nanohtml";

export function briefingTemplate(pages: HTMLElement[]) {
    return html`
        <div class="briefing-app">
            <header>Marcella Sol</header>
            <main>
                <nav class="briefing-index" aria-label="Etapas do briefing">
                    <ol>
                        <li data-briefing-index="welcome">Boas-vindas</li>
                        <li data-briefing-index="about">Sobre vocês e o imóvel</li>
                        <li data-briefing-index="routine">Rotina</li>
                        <li data-briefing-index="investment">Investimento</li>
                        <li data-briefing-index="preferences">Preferências</li>
                        <li data-briefing-index="environments">Ambientes</li>
                        <li data-briefing-index="ending">Finalizar</li>
                    </ol>
                </nav>
                <div
                    class="progress"
                    role="progressbar"
                    aria-label="Progresso do briefing"
                    aria-valuemin="1"
                    aria-valuemax="1"
                    aria-valuenow="1"
                ></div>
                <form class="form-page-container">
                    ${pages}
                </form>
            </main>
        </div>
    `;
}
