import type { AdminClientListItem } from "../infrastructure/admin-system.api.js";

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(part => part && part !== "e");
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("") || "?";
}

export function clientListItem(client: AdminClientListItem, template: HTMLTemplateElement): HTMLElement {
    const item = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (!item) throw new Error("A view client está desatualizada: o template da lista está vazio.");
    item.dataset.clientId = client.id;
    item.querySelector<HTMLElement>(".client-list-client-initials")!.textContent = initials(client.name);
    item.querySelector<HTMLElement>(".client-list-client-name")!.textContent = client.name;
    item.querySelector<HTMLElement>(".client-list-client-type")!.textContent = client.type || "Não informado";
    item.querySelector<HTMLElement>(".client-step-text")!.textContent = client.hasFilledBriefing
        ? "Briefing preenchido" : "Aguardando preenchimento do briefing";
    item.querySelector<HTMLElement>(".client-status-text")!.textContent = "(WIP)";
    item.querySelector<HTMLButtonElement>(".client-delete")!
        .setAttribute("aria-label", `Apagar cliente ${client.name}`);
    return item;
}
