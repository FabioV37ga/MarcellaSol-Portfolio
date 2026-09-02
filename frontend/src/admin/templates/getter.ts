import u from "umbrellajs";
import type { system, dbView, briefing } from "./interface.js";

type TemplateType = "system" | "briefing";

const systemViewNames: Record<string, keyof system> = {
    base: "base",
    home: "home",
    client: "client",
    "new-client": "newClient",
    "client-management": "clientManagement",
    "client-proposals": "clientProposals"
};

const briefingViewNames: Record<string, keyof briefing> = {
    "briefing-home": "home",
    "briefing-rooms": "rooms",
    "briefing-added-room": "addedRoom",
    "briefing-investment": "investment"
};

export default function getTemplates(
    templateType: "system",
    elements: dbView[],
    name: string
): system;
export default function getTemplates(
    templateType: "briefing",
    elements: dbView[],
    name: string
): briefing;
export default function getTemplates(
    templateType: TemplateType,
    elements: dbView[],
    name: string
): system | briefing {
    const viewNames = templateType === "system" ? systemViewNames : briefingViewNames;
    const templates: Record<string, HTMLElement> = {};

    elements.forEach(databaseView => {
        const viewName = databaseView.viewName?.trim().toLowerCase();
        const templateKey = viewNames[viewName];
        if (!templateKey) return;

        const element = u(databaseView.view.split("%username%").join(name)).first() as HTMLElement | undefined;
        if (!element) throw new Error(`A view "${databaseView.viewName}" possui HTML inválido.`);
        if (templates[templateKey]) throw new Error(`A view "${databaseView.viewName}" está duplicada.`);
        templates[templateKey] = element;
    });

    return templates as system | briefing;
}
