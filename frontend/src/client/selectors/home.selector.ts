interface HomeElements {
    stagesProcesses: HTMLElement;
    financial: HTMLElement;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Elemento ${selector} não encontrado na view home do cliente.`);
    return element;
}

function getHomeElements(): HomeElements {
    return {
        stagesProcesses: requiredElement("#client-stages-processes"),
        financial: requiredElement("#client-financial")
    };
}

export { getHomeElements, type HomeElements };
