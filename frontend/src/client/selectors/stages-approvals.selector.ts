interface StagesApprovalsElements {
    homeIndex: HTMLElement;
    back: HTMLElement;
    list: HTMLElement;
    loading: HTMLElement;
    empty: HTMLElement;
    feedback: HTMLElement;
    paginationStatus: HTMLElement;
    loadMore: HTMLButtonElement;
    approveDialog: HTMLDialogElement;
    approveComment: HTMLTextAreaElement;
    approveAttachments: HTMLInputElement;
    approveFeedback: HTMLElement;
    approveCancel: HTMLButtonElement;
    approveConfirm: HTMLButtonElement;
    rejectDialog: HTMLDialogElement;
    rejectComment: HTMLTextAreaElement;
    rejectAttachments: HTMLInputElement;
    rejectRevisionConfirmation: HTMLInputElement;
    rejectFeedback: HTMLElement;
    rejectCancel: HTMLButtonElement;
    rejectConfirm: HTMLButtonElement;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Elemento ${selector} não encontrado na view de etapas e aprovações do cliente.`);
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
        paginationStatus: requiredElement("#client-approvals-pagination-status"),
        loadMore: requiredElement("#client-approvals-load-more"),
        approveDialog: requiredElement("#client-approval-approve-dialog"),
        approveComment: requiredElement("#client-approval-approve-comment"),
        approveAttachments: requiredElement("#client-approval-approve-attachments"),
        approveFeedback: requiredElement("#client-approval-approve-feedback"),
        approveCancel: requiredElement("#client-approval-approve-cancel"),
        approveConfirm: requiredElement("#client-approval-approve-confirm"),
        rejectDialog: requiredElement("#client-approval-reject-dialog"),
        rejectComment: requiredElement("#client-approval-reject-comment"),
        rejectAttachments: requiredElement("#client-approval-reject-attachments"),
        rejectRevisionConfirmation: requiredElement("#client-approval-revision-confirmation"),
        rejectFeedback: requiredElement("#client-approval-reject-feedback"),
        rejectCancel: requiredElement("#client-approval-reject-cancel"),
        rejectConfirm: requiredElement("#client-approval-reject-confirm")
    };
}

export type { StagesApprovalsElements };
