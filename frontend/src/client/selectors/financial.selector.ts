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
        feedback: requiredElement<HTMLElement>("#client-financial-feedback")
    };
}
