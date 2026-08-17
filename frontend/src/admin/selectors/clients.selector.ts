import u from "umbrellajs"

interface clientsElements {
    new_client: HTMLElement
}

function getClientsElements(): clientsElements {
    const new_client = u("#add-client").first() as HTMLElement

    return {
        new_client
    }
}

export { getClientsElements, clientsElements } 