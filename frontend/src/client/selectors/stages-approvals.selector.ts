interface StagesApprovalsElements {
    homeIndex: HTMLElement;
    back: HTMLElement;
    list: HTMLElement;
    loading: HTMLElement;
    empty: HTMLElement;
    feedback: HTMLElement;
    rejectDialog: HTMLDialogElement;
    rejectComment: HTMLTextAreaElement;
    rejectFeedback: HTMLElement;
    rejectCancel: HTMLButtonElement;
    rejectConfirm: HTMLButtonElement;
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
        feedback: requiredElement("#client-approvals-feedback"),
        rejectDialog: requiredElement("#client-approval-reject-dialog"),
        rejectComment: requiredElement("#client-approval-reject-comment"),
        rejectFeedback: requiredElement("#client-approval-reject-feedback"),
        rejectCancel: requiredElement("#client-approval-reject-cancel"),
        rejectConfirm: requiredElement("#client-approval-reject-confirm")
    };
}

export type { StagesApprovalsElements };
