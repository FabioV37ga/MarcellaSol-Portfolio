import u from "umbrellajs";

interface newClientElements{
    root: HTMLElement,
    cancel: HTMLElement
}

function getNewClientElements(): newClientElements{
    const root = u(".root-index").first() as HTMLElement
    const cancel = u("#add-client-cancel").first() as HTMLElement

    return {
        root,
        cancel
    }
}

export {getNewClientElements, newClientElements}