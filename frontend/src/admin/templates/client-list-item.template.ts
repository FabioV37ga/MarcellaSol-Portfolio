import type { AdminClientListItem } from "../infrastructure/admin-system.api.js";

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(part => part && part !== "e");
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("") || "?";
}

function field(className: string, text: string): HTMLDivElement {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = text;
    return element;
}

function paragraph(className: string, text: string): HTMLParagraphElement {
    const element = document.createElement("p");
    element.className = className;
    element.textContent = text;
    return element;
}

export function clientListItem(client: AdminClientListItem): HTMLElement {
    const item = document.createElement("div");
    item.className = "client-list-client";
    item.dataset.clientId = client.id;

    const presentation = document.createElement("div");
    presentation.className = "client-list-client-presentation";
    presentation.append(
        field("client-list-client-initials", initials(client.name)),
        field("client-list-client-name", client.name)
    );

    const step = field("client-list-client-step", "");
    step.append(paragraph(
        "client-step-text",
        client.hasFilledBriefing ? "Briefing preenchido" : "Aguardando preenchimento do briefing"
    ));

    const status = field("client-list-client-status", "");
    status.append(paragraph("client-status-text", "(WIP)"));

    item.append(
        presentation,
        field("client-list-client-type", client.type || "Não informado"),
        step,
        status
    );
    return item;
}
