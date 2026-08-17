import html from 'nanohtml'

export function projectStart() {
    return html`
    <div class="project-welcome">
        <div class="project-welcome-logo">
            <img src="badge-logo-white.png" alt="" id="project-welcome-logo">
            <h1 id="project-welcome-title">Alma e Identidade Portuguesa</h1>
            <p id="project-welcome-subtitle">Na contramão da padronização</p>
        </div>
        <div class="project-start-button-container">
            <a id="project-start-button">
                <i class="fa fa-arrow-right" aria-hidden="true"></i>
            </a>
        </div>
    </div>
    `
}