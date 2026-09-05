function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`A view client-financial está desatualizada: ${selector} não foi encontrado.`);
    return element;
}

export interface ClientFinancialElements {
    root: HTMLElement;
    clientsIndex: HTMLElement;
    clientIndex: HTMLElement;
    clientName: HTMLElement;
    titleName: HTMLElement;
    back: HTMLButtonElement;
    paymentsList: HTMLElement;
    newPayment: HTMLButtonElement;
    feedback: HTMLElement;
    dialog: HTMLDialogElement;
    form: HTMLFormElement;
    deleteDialog: HTMLDialogElement;
    deleteTitle: HTMLElement;
    deleteDescription: HTMLElement;
    deleteWarning: HTMLElement;
    deleteCountdown: HTMLElement;
    deleteCancel: HTMLButtonElement;
    deleteConfirm: HTMLButtonElement;
}

export function getClientFinancialElements(): ClientFinancialElements {
    return {
        root: requiredElement(".financial-management-container"),
        clientsIndex: requiredElement("#financial-clients-index"),
        clientIndex: requiredElement("#financial-client-index"),
        clientName: requiredElement("#financial-client-name"),
        titleName: requiredElement("#financial-title-name"),
        back: requiredElement("#financial-back"),
        paymentsList: requiredElement("#financial-payments-list"),
        newPayment: requiredElement("#financial-new-payment"),
        feedback: requiredElement("#financial-feedback"),
        dialog: requiredElement("#financial-payment-dialog"),
        form: requiredElement("#financial-payment-form"),
        deleteDialog: requiredElement("#financial-delete-dialog"),
        deleteTitle: requiredElement("#financial-delete-title"),
        deleteDescription: requiredElement("#financial-delete-description"),
        deleteWarning: requiredElement("#financial-delete-warning"),
        deleteCountdown: requiredElement("#financial-delete-countdown"),
        deleteCancel: requiredElement("#financial-delete-cancel"),
        deleteConfirm: requiredElement("#financial-delete-confirm")
    };
}
