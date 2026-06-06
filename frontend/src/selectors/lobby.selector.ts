import u from "umbrellajs";

export function getButton(): HTMLElement{
    return u("#host-startGame").first() as HTMLElement
}

export function getPlayers(): HTMLElement[]{
    return u(".lobby-player").nodes as HTMLElement[]
}

export function getContainer(): HTMLElement{
    return u(".lobby-playerList").first() as HTMLElement
}