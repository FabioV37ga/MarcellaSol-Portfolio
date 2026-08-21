export interface BriefingRoom {
    id: number;
    index: number;
    name: string;
    type: string;
    subtype?: string;
    options: boolean[];
}

export interface BriefingDescription {
    category: string;
    type: string;
    name: string;
    residentAmount: number;
}

export interface BriefingDefinition {
    id?: string;
    user?: { name?: string };
    description?: BriefingDescription;
    investmentFlexibility?: boolean;
    rooms?: BriefingRoom[];
}

export interface ResolvedBriefingDefinition {
    id?: string;
    user?: { name?: string };
    description: BriefingDescription;
    investmentFlexibility: boolean;
    rooms: BriefingRoom[];
}

export interface ClientSummary {
    id?: string;
    name: string;
    hasFilledBriefing: boolean;
}

export interface NewClientPayload {
    _id?: string;
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    briefing: BriefingDefinition;
}

export interface ClientBriefingResponse {
    clientObject?: Partial<ClientSummary>;
    briefingObject?: Partial<ResolvedBriefingDefinition>;
}
