import html from "nanohtml";

export function briefingTemplate(pages: HTMLElement[], title = "Briefing residencial") {
    return html`
        <div class="briefing-app">
            <header>Marcella Sol</header>
            <main>
                <p>${title}</p>
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
