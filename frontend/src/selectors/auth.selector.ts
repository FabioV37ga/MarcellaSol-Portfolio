import u from "umbrellajs"

export interface authElements {
    authScreen: HTMLElement
    nicknameInput: HTMLElement
    characterInputs: HTMLElement[]
    confirmButton: HTMLElement
}

export function getElements(): authElements {

    const authScreen = u(".auth").first() as HTMLElement
    const nicknameInput = u("#nickname_input").first() as HTMLInputElement
    const characterInputs = u(".char").nodes as HTMLElement[]
    const confirmButton = u("#confirm-auth").first() as HTMLElement

    return {
        authScreen,
        nicknameInput,
        characterInputs,
        confirmButton
    }
}