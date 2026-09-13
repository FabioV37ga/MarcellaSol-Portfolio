import html from "nanohtml";

export interface BriefingOption {
    value: string;
    label: string;
}

export interface BriefingDescriptiveOption extends BriefingOption {
    description: string;
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

export function briefingDescriptiveOptions(
    type: "checkbox" | "radio",
    name: string,
    options: BriefingDescriptiveOption[]
): HTMLElement[] {
    return options.map(option => html`
        <label>
            <input type="${type}" name="${name}" value="${option.value}">
            <strong>${option.label}</strong>
            <span>${option.description}</span>
        </label>
    `);
}
