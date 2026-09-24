import type { ProjectStage, ProjectStageKey } from "@/shared/project-stages.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import type { AdminSession } from "./admin-system.api.js";

export type ProposalStatus = "sent" | "beated" | "resent" | "approved" | "changes-completed" | "Cancelled";

export interface ClientProposal {
    _id: string;
    userId: string;
    title: string;
    description: string;
    attachments: string[];
    attachment?: string;
    userComment: string;
    clientResponses: Array<{
        decision: "approved" | "beated";
        comment: string;
        attachments: string[];
        createdAt: string;
    }>;
    stageKey?: ProjectStageKey;
    status: ProposalStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ProposalFields {
    title: string;
    description: string;
    stageKey: ProjectStageKey;
    attachments?: File[];
}

export interface ProposalStageMutation {
    proposal: ClientProposal;
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

export interface ProposalPage {
    proposals: ClientProposal[];
    page: { limit: number; hasMore: boolean; nextCursor?: string };
}

interface ProposalEnvelope {
    proposal?: ClientProposal;
    proposals?: ClientProposal[];
    currentStageKey?: ProjectStageKey;
    projectStages?: ProjectStage[];
    page?: ProposalPage["page"];
}

export interface AdminProposalsGateway {
    loadProposals(session: AdminSession, clientId: string, cursor?: string): Promise<ProposalPage>;
    createProposal(session: AdminSession, clientId: string, fields: ProposalFields): Promise<ProposalStageMutation>;
    editProposal(session: AdminSession, clientId: string, proposalId: string, fields: ProposalFields): Promise<ClientProposal>;
    confirmProposalChanges(session: AdminSession, clientId: string, proposalId: string): Promise<ProposalStageMutation>;
    deleteProposal(session: AdminSession, clientId: string, proposalId: string): Promise<void>;
    deleteProposalAttachment(session: AdminSession, clientId: string, proposalId: string, attachmentIndex: number): Promise<ClientProposal>;
}

export class AdminProposalsApi implements AdminProposalsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }

    async loadProposals(session: AdminSession, clientId: string, cursor?: string): Promise<ProposalPage> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const result = await this.http.request<ProposalEnvelope>(`${this.collectionPath(clientId)}${query}`, { token: session.token });
        return {
            proposals: result?.proposals ?? [],
            page: {
                limit: typeof result?.page?.limit === "number" ? result.page.limit : 20,
                hasMore: result?.page?.hasMore === true,
                ...(typeof result?.page?.nextCursor === "string" ? { nextCursor: result.page.nextCursor } : {})
            }
        };
    }

    async createProposal(session: AdminSession, clientId: string, fields: ProposalFields): Promise<ProposalStageMutation> {
        return this.stageMutation(await this.save(session, clientId, fields), "criar");
    }

    async editProposal(session: AdminSession, clientId: string, proposalId: string, fields: ProposalFields): Promise<ClientProposal> {
        const proposal = (await this.save(session, clientId, fields, proposalId))?.proposal;
        if (!proposal) throw new Error("Resposta inválida ao salvar proposta");
        return proposal;
    }

    async confirmProposalChanges(session: AdminSession, clientId: string, proposalId: string): Promise<ProposalStageMutation> {
        const result = await this.http.request<ProposalEnvelope>(`${this.itemPath(clientId, proposalId)}/complete-changes`, {
            method: "POST", token: session.token
        });
        return this.stageMutation(result, "confirmar alterações da");
    }

    async deleteProposal(session: AdminSession, clientId: string, proposalId: string): Promise<void> {
        await this.http.request(this.itemPath(clientId, proposalId), { method: "DELETE", token: session.token });
    }

    async deleteProposalAttachment(session: AdminSession, clientId: string, proposalId: string, attachmentIndex: number): Promise<ClientProposal> {
        const result = await this.http.request<ProposalEnvelope>(`${this.itemPath(clientId, proposalId)}/attachments/${encodeURIComponent(attachmentIndex)}`, {
            method: "DELETE", token: session.token
        });
        if (!result?.proposal) throw new Error("Resposta inválida ao remover o anexo");
        return result.proposal;
    }

    private async save(session: AdminSession, clientId: string, fields: ProposalFields, proposalId?: string): Promise<ProposalEnvelope> {
        const body = new FormData();
        body.set("title", fields.title);
        body.set("description", fields.description);
        body.set("stageKey", fields.stageKey);
        fields.attachments?.forEach(file => body.append("attachments", file));
        return this.http.request<ProposalEnvelope>(proposalId ? this.itemPath(clientId, proposalId) : this.collectionPath(clientId), {
            method: proposalId ? "PUT" : "POST", token: session.token, body
        });
    }

    private stageMutation(result: ProposalEnvelope, action: "criar" | "confirmar alterações da"): ProposalStageMutation {
        if (!result?.proposal || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(`Resposta inválida ao ${action} proposta`);
        }
        return { proposal: result.proposal, currentStageKey: result.currentStageKey, projectStages: result.projectStages };
    }

    private collectionPath(clientId: string): string {
        return `/admin/clients/${encodeURIComponent(clientId)}/proposals`;
    }

    private itemPath(clientId: string, proposalId: string): string {
        return `${this.collectionPath(clientId)}/${encodeURIComponent(proposalId)}`;
    }
}
