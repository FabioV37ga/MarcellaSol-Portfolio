interface clientsElements {
    new_client: HTMLElement
    list: HTMLElement
    itemTemplate: HTMLTemplateElement
    deleteDialog: HTMLDialogElement
    deleteForm: HTMLFormElement
    deleteName: HTMLElement
    deleteConfirmation: HTMLInputElement
    deleteFeedback: HTMLElement
    deleteCancel: HTMLButtonElement
    deleteConfirm: HTMLButtonElement
}

function requiredElement<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) throw new Error(`A view client está desatualizada: ${selector} não foi encontrado.`)
    return element
}

function getClientsElements(): clientsElements {
    const new_client = requiredElement<HTMLElement>("#add-client")
    const list = requiredElement<HTMLElement>(".client-list")
    const itemTemplate = requiredElement<HTMLTemplateElement>("#client-list-item-template")
    const deleteDialog = requiredElement<HTMLDialogElement>("#client-delete-dialog")
    const deleteForm = requiredElement<HTMLFormElement>("#client-delete-form")
    const deleteName = requiredElement<HTMLElement>("#client-delete-name")
    const deleteConfirmation = requiredElement<HTMLInputElement>("#client-delete-confirmation")
    const deleteFeedback = requiredElement<HTMLElement>("#client-delete-feedback")
    const deleteCancel = requiredElement<HTMLButtonElement>("#client-delete-cancel")
    const deleteConfirm = requiredElement<HTMLButtonElement>("#client-delete-confirm")

    return {
        new_client,
        list,
        itemTemplate,
        deleteDialog,
        deleteForm,
        deleteName,
        deleteConfirmation,
        deleteFeedback,
        deleteCancel,
        deleteConfirm
    }
}

export { getClientsElements, clientsElements }
