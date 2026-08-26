import u from "umbrellajs";

export interface ClientManagementElements {
    clientsIndex: HTMLElement;
    clientName: HTMLElement;
    titleName: HTMLElement;
    back: HTMLElement;
    drive: HTMLAnchorElement;
    briefingReport: HTMLButtonElement;
    briefingReportLabel: HTMLElement;
}

export function getClientManagementElements(): ClientManagementElements {
    return {
        clientsIndex: u("#client-management-clients-index").first() as HTMLElement,
        clientName: u("#client-management-index-name").first() as HTMLElement,
        titleName: u("#client-management-name").first() as HTMLElement,
        back: u("#client-management-back").first() as HTMLElement,
        drive: u("#client-management-drive").first() as HTMLAnchorElement,
        briefingReport: u("#client-management-briefing-report").first() as HTMLButtonElement,
        briefingReportLabel: u("#client-management-briefing-report span").first() as HTMLElement
    };
}
