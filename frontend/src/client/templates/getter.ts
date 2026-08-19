import u from "umbrellajs";
import { system, DbView } from "./interface.js";

export default function getTemplates(elements: DbView[], name: string) {
    const views: system = {};

    elements.forEach((dbView, index) => {
        const element = u(dbView.view.split("%username%").join(name)).first() as HTMLElement | undefined;
        if (!element) return;

        const viewName = dbView.viewName?.trim().toLowerCase();
        if (viewName) views[viewName] = element;

        // Compatibilidade com os registros antigos, anteriores ao uso de viewName.
        if (index === 0 && !views.base) views.base = element;
        if (index === 1 && !views.home) views.home = element;
    });

    return views;
}
