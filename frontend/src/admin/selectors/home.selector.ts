import u from "umbrellajs";

export interface homeElements {
    access_portfolio: HTMLElement;
    access_client: HTMLElement;
}

export function getHomeElements(): homeElements {
    return {
        access_portfolio: u("#portfolio").first() as HTMLElement,
        access_client: u("#client").first() as HTMLElement
    };
}
