import u from "umbrellajs";

interface homeElements{
    access_portfolio: HTMLElement,
    access_client: HTMLElement,
}

function getHomeElements(): homeElements {
    // @Elementos gerais (existem em todos os dispositivos)
    const access_portfolio = u("#portfolio").first() as HTMLElement
    const access_client = u("#client").first() as HTMLElement
    

    return {
        access_portfolio,
        access_client
    }
}

export {getHomeElements, homeElements}

