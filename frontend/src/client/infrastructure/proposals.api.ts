import type { ProjectStage, ProjectStageKey } from "@/shared/project-stages.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";

export type ClientProposalStatus = "sent" | "beated" | "resent" | "approved" | "changes-completed" | "Cancelled";
export interface ClientProposalResponse { decision: "approved" | "beated"; comment: string; attachments: string[]; createdAt: string; }
export interface ClientProposal {
    _id: string; title: string; description: string; attachments: string[]; userComment: string;
    clientResponses: ClientProposalResponse[]; stageKey?: ProjectStageKey; status: ClientProposalStatus;
    createdAt: string; updatedAt: string;
}
export interface ClientProjectResponse {
    proposals: ClientProposal[];
    projectStages: ProjectStage[];
    currentStageKey: ProjectStageKey;
    page: { limit: number; hasMore: boolean; nextCursor?: string };
}
export interface ClientProposalDecision { proposal: ClientProposal; projectStages: ProjectStage[]; currentStageKey: ProjectStageKey; }
export interface ClientProposalsGateway {
    loadProposals(token: string, cursor?: string): Promise<ClientProjectResponse>;
    approveProposal(token: string, proposalId: string, comment: string, files?: File[]): Promise<ClientProposalDecision>;
    beatProposal(token: string, proposalId: string, comment: string, confirmRevisionRound: boolean, files?: File[]): Promise<ClientProposalDecision>;
}

export class ClientProposalsApi implements ClientProposalsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }

    async loadProposals(token: string, cursor?: string): Promise<ClientProjectResponse> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const result = await this.http.request<Partial<ClientProjectResponse>>(`/client/proposals${query}`, { token });
        return {
            proposals: result?.proposals ?? [],
            projectStages: result?.projectStages ?? [],
            currentStageKey: result?.currentStageKey ?? "briefing",
            page: {
                limit: typeof result?.page?.limit === "number" ? result.page.limit : 20,
                hasMore: result?.page?.hasMore === true,
                ...(typeof result?.page?.nextCursor === "string" ? { nextCursor: result.page.nextCursor } : {})
            }
        };
    }

    approveProposal(token: string, proposalId: string, comment: string, files: File[] = []): Promise<ClientProposalDecision> {
        return this.decide(token, proposalId, "approve", comment, undefined, files);
    }

    beatProposal(token: string, proposalId: string, comment: string, confirmRevisionRound: boolean, files: File[] = []): Promise<ClientProposalDecision> {
        return this.decide(token, proposalId, "beat", comment, confirmRevisionRound, files);
    }

    private async decide(token: string, proposalId: string, decision: "approve" | "beat", comment: string, confirmRevisionRound: boolean | undefined, files: File[]): Promise<ClientProposalDecision> {
        const body = new FormData();
        body.set("comment", comment);
        if (confirmRevisionRound !== undefined) body.set("confirmRevisionRound", String(confirmRevisionRound));
        files.forEach(file => body.append("attachments", file, file.name));
        const result = await this.http.request<Partial<ClientProposalDecision>>(`/client/proposals/${encodeURIComponent(proposalId)}/${decision}`, {
            method: "POST", token, body
        });
        if (!result?.proposal || !result.currentStageKey || !Array.isArray(result.projectStages)) throw new Error("Não foi possível registrar sua decisão.");
        return result as ClientProposalDecision;
    }
}
