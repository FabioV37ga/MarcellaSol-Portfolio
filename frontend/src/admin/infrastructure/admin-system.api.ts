import { config } from "@/utils/connection.js";
import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { dbView } from "../templates/interface.js";
import type { ProjectStage, ProjectStageKey, ProjectStageStatus } from "@/shared/project-stages.js";

export interface AdminSession {
    token: string;
}

export interface AdminClientListItem {
    id: string;
    name: string;
    type: string;
    hasFilledBriefing: boolean;
}

export interface AdminClientDetails extends AdminClientListItem {
    driveFolderUrl?: string;
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
    hasProjectStageOrder: boolean;
}

export interface UpdatedClientProjectStage {
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

export interface ProposalStageMutation extends UpdatedClientProjectStage {
    proposal: ClientProposal;
}

export interface BriefingReportStatus {
    exists: boolean;
    folderUrl?: string;
}

export type ProposalStatus = "sent" | "beated" | "resent" | "approved" | "Cancelled";

export interface ClientProposal {
    _id: string;
    userId: string;
    title: string;
    description: string;
    attachments: string[];
    attachment?: string;
    userComment: string;
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

export class AdminSystemApi {
    private authorization(session: AdminSession): HeadersInit {
        return { Authorization: `Bearer ${session.token}` };
    }

    private async proposalRequest(
        response: Response
    ): Promise<{
        proposal?: ClientProposal;
        proposals?: ClientProposal[];
        currentStageKey?: ProjectStageKey;
        projectStages?: ProjectStage[];
        message?: string;
    }> {
        const result = await response.json().catch(() => ({})) as {
            proposal?: ClientProposal;
            proposals?: ClientProposal[];
            currentStageKey?: ProjectStageKey;
            projectStages?: ProjectStage[];
            message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível processar a proposta");
        return result;
    }

    async loadProposals(session: AdminSession, userId: string): Promise<ClientProposal[]> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients/${encodeURIComponent(userId)}/proposals`, {
            headers: this.authorization(session)
        });
        return (await this.proposalRequest(response)).proposals ?? [];
    }

    async createProposal(session: AdminSession, userId: string, fields: ProposalFields): Promise<ProposalStageMutation> {
        const result = await this.saveProposal(session, userId, fields);
        if (!result.proposal || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error("Resposta inválida ao criar proposta");
        }
        return {
            proposal: result.proposal,
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async editProposal(
        session: AdminSession, userId: string, proposalId: string, fields: ProposalFields
    ): Promise<ClientProposal> {
        const proposal = (await this.saveProposal(session, userId, fields, proposalId)).proposal;
        if (!proposal) throw new Error("Resposta inválida ao salvar proposta");
        return proposal;
    }

    private async saveProposal(
        session: AdminSession, userId: string, fields: ProposalFields, proposalId?: string
    ): ReturnType<AdminSystemApi["proposalRequest"]> {
        const body = new FormData();
        body.set("title", fields.title);
        body.set("description", fields.description);
        body.set("stageKey", fields.stageKey);
        fields.attachments?.forEach(file => body.append("attachments", file));
        const suffix = proposalId ? `/${encodeURIComponent(proposalId)}` : "";
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(userId)}/proposals${suffix}`,
            { method: proposalId ? "PUT" : "POST", headers: this.authorization(session), body }
        );
        return this.proposalRequest(response);
    }

    async resendProposal(session: AdminSession, userId: string, proposalId: string): Promise<ProposalStageMutation> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(userId)}/proposals/${encodeURIComponent(proposalId)}/resend`,
            { method: "POST", headers: this.authorization(session) }
        );
        const result = await this.proposalRequest(response);
        if (!result.proposal || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error("Resposta inválida ao reenviar proposta");
        }
        return {
            proposal: result.proposal,
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async deleteProposal(session: AdminSession, userId: string, proposalId: string): Promise<void> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(userId)}/proposals/${encodeURIComponent(proposalId)}`,
            { method: "DELETE", headers: this.authorization(session) }
        );
        if (response.ok) return;
        const result = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(result.message ?? "Não foi possível remover a proposta");
    }

    async deleteProposalAttachment(
        session: AdminSession,
        userId: string,
        proposalId: string,
        attachmentIndex: number
    ): Promise<ClientProposal> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(userId)}/proposals/${encodeURIComponent(proposalId)}/attachments/${attachmentIndex}`,
            { method: "DELETE", headers: this.authorization(session) }
        );
        const proposal = (await this.proposalRequest(response)).proposal;
        if (!proposal) throw new Error("Resposta inválida ao remover o anexo");
        return proposal;
    }

    async loadClients(session: AdminSession): Promise<AdminClientListItem[]> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients`, {
            headers: { Authorization: `Bearer ${session.token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            message?: string;
            clients?: AdminClientListItem[];
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível listar os clientes");
        return result.clients ?? [];
    }

    async loadClient(session: AdminSession, id: number | string): Promise<AdminClientDetails> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${session.token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            message?: string;
            client?: AdminClientDetails;
        };
        if (!response.ok || !result.client) {
            throw new Error(result.message ?? "Não foi possível carregar o cliente");
        }
        return result.client;
    }

    async deleteClient(session: AdminSession, clientId: string, confirmationName: string): Promise<void> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({ confirmationName })
        });
        if (response.ok) return;
        const result = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(result.message ?? "Não foi possível apagar o cliente");
    }

    async updateClientProjectStage(
        session: AdminSession,
        clientId: string,
        stageKey: ProjectStageKey,
        status: ProjectStageStatus
    ): Promise<UpdatedClientProjectStage> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}/project-stage`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`
                },
                body: JSON.stringify({ stageKey, status })
            }
        );
        const result = await response.json().catch(() => ({})) as Partial<UpdatedClientProjectStage> & {
            message?: string;
        };
        if (!response.ok || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(result.message ?? "Não foi possível atualizar a etapa do projeto");
        }
        return {
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async updateClientProjectStageOrder(
        session: AdminSession,
        clientId: string,
        stageKeys: ProjectStageKey[]
    ): Promise<UpdatedClientProjectStage> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}/project-stages/order`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`
                },
                body: JSON.stringify({ stageKeys })
            }
        );
        const result = await response.json().catch(() => ({})) as Partial<UpdatedClientProjectStage> & {
            message?: string;
        };
        if (!response.ok || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(result.message ?? "Não foi possível salvar a ordem das etapas");
        }
        return {
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async loadBriefingReportStatus(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.requestBriefingReport(session, id, "GET");
    }

    async generateBriefingReport(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.requestBriefingReport(session, id, "POST");
    }

    private async requestBriefingReport(
        session: AdminSession,
        id: string,
        method: "GET" | "POST"
    ): Promise<BriefingReportStatus> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(id)}/briefing-report`,
            { method, headers: { Authorization: `Bearer ${session.token}` } }
        );
        const result = await response.json().catch(() => ({})) as BriefingReportStatus & { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível processar o relatório");
        return result;
    }

    async loadViews(session: AdminSession): Promise<dbView[] | undefined> {
        const response = await fetch(`${config.apiBaseUrl}/view/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({})
        });
        if (!response.ok) return undefined;

        const result = await response.json() as { view: dbView[] };
        return result.view;
    }

    async createClient(session: AdminSession, client: NewClientPayload): Promise<unknown> {
        const response = await fetch(`${config.apiBaseUrl}/admin/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({ client })
        });
        const result = await response.json().catch(() => ({})) as { message?: string; client?: unknown };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível criar o cliente");
        return result.client;
    }
}
