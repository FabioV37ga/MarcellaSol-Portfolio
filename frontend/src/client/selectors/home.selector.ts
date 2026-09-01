import u from "umbrellajs";

interface HomeElements {
    stagesProcesses: HTMLElement;
}

function getHomeElements(): HomeElements {
    return {
        stagesProcesses: u("#client-stages-processes").first() as HTMLElement
    };
}

export { getHomeElements, type HomeElements };
