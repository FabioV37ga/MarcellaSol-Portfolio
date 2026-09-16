import type { BriefingDefinition, NewClientPayload } from "@/shared/briefing/briefing.types.js";

export interface NewClientCredentials { name: string; login: string; password: string; }

export class ClientCreationDraft {
    constructor(private credentials: NewClientCredentials) { }

    update(credentials: NewClientCredentials): void {
        this.credentials = credentials;
    }

    getCredentials(): NewClientCredentials {
        return { ...this.credentials };
    }

    toPayload(briefing: BriefingDefinition): NewClientPayload {
        return {
            _id: "",
            ...this.credentials,
            hasFilledBriefing: false,
            briefing
        };
    }
}
