import type { DatabaseView } from "@/shared/contracts/database-view.js";

export interface system{
    base?: HTMLElement;
    home?: HTMLElement;
    client?: HTMLElement;
    clientManagement?: HTMLElement;
    clientProposals?: HTMLElement;
    clientFinancial?: HTMLElement;
    newClient?: HTMLElement
    // home2: HTMLElement
    // test: HTMLElement
}

export interface briefing{
    home?: HTMLElement;
    investment?: HTMLElement
    rooms: HTMLElement;
    addedRoom?: HTMLElement;
}

export type dbView = DatabaseView;
