import u from "umbrellajs";

interface HomeElements {
    stagesProcesses: HTMLElement;
    financial: HTMLElement;
}

function getHomeElements(): HomeElements {
    return {
        stagesProcesses: u("#client-stages-processes").first() as HTMLElement,
        financial: u("#client-financial").first() as HTMLElement
    };
}

export { getHomeElements, type HomeElements };
