const roomOption = (text: string): string => `
    <label class="briefing-room-option">
        <input type="checkbox" checked>
        <span class="briefing-room-checkbox">
            <i class="fa fa-check" aria-hidden="true"></i>
        </span>
        <span>${text}</span>
    </label>
`;

const roomCustomizations = (content: string): string => `
    <div class="briefing-room-customizations">
        ${content}
    </div>
`;

const bedroomOptions = `
    <div class="briefing-room-customization-type">
        <label>Tipo</label>
        <select class="briefing-room-select" aria-label="Tipo de quarto">
            <option value="dormitorio">Dormitório</option>
            <option value="suite">Suíte</option>
        </select>
    </div>

    ${roomOption("Incluir pergunta de utilizador e função principal")}
    ${roomOption("Incluir pergunta de fluxo diário")}

    <fieldset class="briefing-room-considerations">
        <legend>Incluir lista de considerações</legend>
        <div class="briefing-room-considerations-grid">
            <label><input type="checkbox" checked> <span>Cama</span></label>
            <label><input type="checkbox" checked> <span>TV</span></label>
            <label><input type="checkbox" checked> <span>Espaço de leitura</span></label>
            <label><input type="checkbox" checked> <span>Home office</span></label>
            <label><input type="checkbox" checked> <span>Penteadeira/Camarim</span></label>
            <label><input type="checkbox" checked> <span>Estante/prateleiras</span></label>
            <label><input type="checkbox" checked> <span>Guarda-roupa</span></label>
            <label><input type="checkbox" checked> <span>Mesa de trabalho/estudo</span></label>
        </div>
    </fieldset>

    ${roomOption("Incluir pergunta de quantidade de roupas e acessórios")}
    ${roomOption("Incluir pergunta de preferências de armazenamento")}
    ${roomOption("Incluir slider de equilíbrio entre armazenamento e leveza")}
    ${roomOption("Incluir caixa de texto para desejos especiais")}
`;

export const briefingRoomOptions = {
    varanda: roomCustomizations(
        roomOption("Incluir pergunta sobre integração de varanda/sala")
    ),

    quarto: roomCustomizations(bedroomOptions),

    investimento: roomCustomizations(
        roomOption("Incluir pergunta sobre flexibilidade de investimento")
    ),

    cozinha: roomCustomizations(
        roomOption("Incluir pergunta sobre refeições rápidas")
    )
} as const;

export type BriefingRoomWithOptions = keyof typeof briefingRoomOptions;

export function getBriefingRoomOptions(room: string): string {
    return briefingRoomOptions[room as BriefingRoomWithOptions] ?? "";
}
