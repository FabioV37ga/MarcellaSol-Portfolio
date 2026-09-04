function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`A view financial está desatualizada: ${selector} não foi encontrado.`);
    return element;
}

export function getClientFinancialElements() {
    return {
        homeIndex: requiredElement<HTMLElement>("#client-financial-home-index"),
        back: requiredElement<HTMLButtonElement>("#client-financial-back"),
        highlight: requiredElement<HTMLElement>("#client-financial-highlight-content"),
        list: requiredElement<HTMLElement>("#client-financial-payments-list"),
        loading: requiredElement<HTMLElement>("#client-financial-loading"),
        empty: requiredElement<HTMLElement>("#client-financial-empty"),
        feedback: requiredElement<HTMLElement>("#client-financial-feedback"),
        pixDialog: requiredElement<HTMLDialogElement>("#client-pix-dialog"),
        pixClose: requiredElement<HTMLButtonElement>("#client-pix-close"),
        pixDescription: requiredElement<HTMLElement>("#client-pix-description"),
        pixLoading: requiredElement<HTMLElement>("#client-pix-loading"),
        pixResult: requiredElement<HTMLElement>("#client-pix-result"),
        pixQr: requiredElement<HTMLImageElement>("#client-pix-qr"),
        pixCode: requiredElement<HTMLTextAreaElement>("#client-pix-code"),
        pixCopy: requiredElement<HTMLButtonElement>("#client-pix-copy"),
        pixExpiry: requiredElement<HTMLElement>("#client-pix-expiry"),
        pixFeedback: requiredElement<HTMLElement>("#client-pix-feedback")
    };
}
