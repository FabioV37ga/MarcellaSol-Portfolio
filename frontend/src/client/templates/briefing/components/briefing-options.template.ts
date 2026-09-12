import html from "nanohtml";

export interface BriefingOption {
    value: string;
    label: string;
}

export function briefingButtonOptions(
    type: "checkbox" | "radio",
    name: string,
    options: BriefingOption[]
): HTMLElement[] {
    return options.map(option => html`
        <label class="button-option">
            <input type="${type}" name="${name}" value="${option.value}">
            <span>${option.label}</span>
        </label>
    `);
}
