// import html from "nanohtml"

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

export interface dbView{
    _id: string;
    viewName: string;
    permission: string;
    view: string;
}

