import u from "umbrellajs";
import type { system, DbView } from "./interface.js";

export default function getTemplates(elements: DbView[], name: string) {
    const views: system = {};

    elements.forEach(dbView => {
        const element = u(dbView.view.split("%username%").join(name)).first() as HTMLElement | undefined;
        if (!element) return;

        const viewName = dbView.viewName?.trim().toLowerCase();
        if (!viewName) throw new Error("Foi recebida uma view de cliente sem viewName.");
        if (views[viewName]) throw new Error(`A view de cliente "${dbView.viewName}" está duplicada.`);
        views[viewName] = element;
    });

    return views;
}
