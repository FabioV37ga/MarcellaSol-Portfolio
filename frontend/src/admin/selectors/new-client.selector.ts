import u from "umbrellajs";

interface newClientElements{
    root: HTMLElement,
    cancel: HTMLElement,
    confirm: HTMLElement,
    nameField: HTMLInputElement;
    loginField: HTMLInputElement
    passwordField: HTMLInputElement
}

function getNewClientElements(): newClientElements{
    const root = u(".root-index").first() as HTMLElement
    const cancel = u("#add-client-cancel").first() as HTMLElement
    const confirm = u("#add-client-confirm").first() as HTMLElement
    const inputs = u(".add-client-form-input").nodes as HTMLInputElement[]

    return {
        root,
        cancel,
        confirm,
        nameField: inputs[0],
        loginField: inputs[1],
        passwordField: inputs[2]
    }
}

export {getNewClientElements, newClientElements}