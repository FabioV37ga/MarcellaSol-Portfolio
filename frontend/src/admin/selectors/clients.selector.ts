import u from "umbrellajs"

interface clientsElements {
    new_client: HTMLElement
    list: HTMLElement
}

function getClientsElements(): clientsElements {
    const new_client = u("#add-client").first() as HTMLElement
    const list = u(".client-list").first() as HTMLElement

    return {
        new_client,
        list
    }
}

export { getClientsElements, clientsElements }
