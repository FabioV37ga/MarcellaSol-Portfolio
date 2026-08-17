export interface system {
    [viewName: string]: HTMLElement;
}

export interface DbView {
    _id: string;
    viewName: string;
    permission: string;
    view: string;
}
