import u from "umbrellajs"

export interface clientElements {
    loading: HTMLElement
    logo: HTMLElement
}

export function getElements(): clientElements {

    const loading = u(".loading-screen").first() as HTMLElement
    const logo = u(".logo-container img").first() as HTMLElement

    return {
        loading,
        logo
    }
}