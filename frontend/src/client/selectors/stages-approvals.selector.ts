interface StagesApprovalsElements {
    homeIndex: HTMLElement;
    back: HTMLElement;
    list: HTMLElement;
    loading: HTMLElement;
    empty: HTMLElement;
    feedback: HTMLElement;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Elemento ${selector} não encontrado.`);
    return element;
}

export function getStagesApprovalsElements(): StagesApprovalsElements {
    return {
        homeIndex: requiredElement("#client-stages-home-index"),
        back: requiredElement("#client-stages-back"),
        list: requiredElement("#client-approvals-list"),
        loading: requiredElement("#client-approvals-loading"),
        empty: requiredElement("#client-approvals-empty"),
        feedback: requiredElement("#client-approvals-feedback")
    };
}

export type { StagesApprovalsElements };
