import { config } from "@/utils/connection.js";
import type { ClientBriefingResponse } from "@/shared/briefing/briefing.types.js";
import type { DbView } from "../templates/interface.js";

export type ClientSystemResponse = { view: DbView[] } & ClientBriefingResponse;

export type ClientProposalStatus = "sent" | "beated" | "resent" | "Cancelled";

export interface ClientProposal {
    _id: string;
    title: string;
    description: string;
    attachments: string[];
    userComment: string;
    status: ClientProposalStatus;
    createdAt: string;
    updatedAt: string;
}

export class ClientSystemApi {
    async load(token: string): Promise<ClientSystemResponse | undefined> {
        const response = await fetch(`${config.apiBaseUrl}/view/client`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) return undefined;
        return response.json() as Promise<ClientSystemResponse>;
    }

    async loadProposals(token: string): Promise<ClientProposal[]> {
        const response = await fetch(`${config.apiBaseUrl}/client/proposals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            proposals?: ClientProposal[];
            message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar as aprovações.");
        return result.proposals ?? [];
    }
}
