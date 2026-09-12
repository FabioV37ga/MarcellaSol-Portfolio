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
    return briefingSimpleOptions(type, name, options, "button-option");
}

export function briefingSimpleOptions(
    type: "checkbox" | "radio",
    name: string,
    options: BriefingOption[],
    labelClass?: string
): HTMLElement[] {
    return options.map(option => labelClass
        ? html`
            <label class="${labelClass}">
                <input type="${type}" name="${name}" value="${option.value}">
                <span>${option.label}</span>
            </label>
        `
        : html`
            <label>
                <input type="${type}" name="${name}" value="${option.value}">
                <span>${option.label}</span>
            </label>
        `);
}
