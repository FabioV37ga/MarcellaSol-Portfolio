import html from "nanohtml";

const surfaces = [
    { key: "cabinetry", label: "Marcenaria" },
    { key: "stones", label: "Pedras / bancadas" },
    { key: "floor", label: "Pisos e revestimentos" },
    { key: "metals", label: "Metais" }
];

const finishes = [
    { value: "fosco", label: "Fosco" },
    { value: "acetinado", label: "Acetinado" },
    { value: "cromado", label: "Cromado" },
    { value: "polido", label: "Polido" },
    { value: "sem-preferencia", label: "N/A" }
];

export function surfaceFinishesTable(): HTMLElement {
    return html`
        <fieldset class="briefing-input-box briefing-surface-finishes">
            <legend>Preferências de acabamentos das superfícies</legend>
            <span>Indique o acabamento que mais agrada vocês em cada superfície.</span>
            <div class="briefing-surface-finishes-scroll" role="region" aria-label="Tabela de preferências de acabamentos" tabindex="0">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Superfície</th>
                            ${finishes.map(finish => html`<th scope="col">${finish.label}</th>`)}
                        </tr>
                    </thead>
                    <tbody>
                        ${surfaces.map(surface => html`
                            <tr>
                                <th scope="row">${surface.label}</th>
                                ${finishes.map(finish => html`
                                    <td>
                                        <label title="${finish.label} para ${surface.label}">
                                            <input
                                                type="radio"
                                                name="surface-finish-${surface.key}"
                                                value="${finish.value}"
                                                data-briefing-question="${surface.label}"
                                                aria-label="${finish.label} para ${surface.label}"
                                            >
                                        </label>
                                    </td>
                                `)}
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </fieldset>
    `;
}
