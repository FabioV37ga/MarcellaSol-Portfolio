import html from "nanohtml";

export interface BriefingVisualOption {
    value: string;
    imageSrc: string;
    imageAlt: string;
    imageClass?: string;
    badge?: string;
    title?: string;
    label?: string;
}

export function briefingVisualOptions(
    type: "checkbox" | "radio",
    name: string,
    options: BriefingVisualOption[]
): HTMLElement[] {
    return options.map(option => html`
        <label>
            <input type="${type}" name="${name}" value="${option.value}">
            <img class="${option.imageClass ?? "briefing-option-image"}" src="${option.imageSrc}" alt="${option.imageAlt}">
            ${option.badge ? html`<span>${option.badge}</span>` : null}
            ${option.title ? html`<strong>${option.title}</strong>` : null}
            ${option.label ? html`<span>${option.label}</span>` : null}
        </label>
    `);
}
