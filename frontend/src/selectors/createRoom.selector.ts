import u from "umbrellajs"

export interface createRoomElements {
    window: HTMLElement,
    random: HTMLElement,
    wordInput: HTMLElement,
    confirm: HTMLElement,
    close: HTMLElement,
}

export function getElements(): createRoomElements {
    const window = u(".create-room").first() as HTMLElement
    const random = u(".randomizeWords").first() as HTMLElement
    const wordInput = u(".create-room-words").first() as HTMLElement
    const confirm = u(".confirmRoomCreation").first() as HTMLElement
    const close = u("#createRoom-close").first() as HTMLElement

    return {
        window,
        random,
        wordInput,
        confirm,
        close
    }
}

export function getConfirmedWords(): HTMLElement[]{
    return u(".confirmedWord").nodes as HTMLElement[]
}