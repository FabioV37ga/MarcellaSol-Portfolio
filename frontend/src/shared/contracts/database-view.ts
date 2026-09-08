export const databaseViewTypes = ["system", "briefing", "client", "financial"] as const;
export type DatabaseViewType = typeof databaseViewTypes[number];

export interface DatabaseView {
    _id: string;
    viewName: string;
    permission: string;
    type: DatabaseViewType;
    view: string;
}
