import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { ProjectStage, ProjectStageKey, ProjectStageStatus } from "@/shared/project-stages.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import type { AdminSession } from "./admin-system.api.js";

export interface AdminClientListItem {
    id: string;
    name: string;
    type: string;
    hasFilledBriefing: boolean;
    currentStageKey: ProjectStageKey;
    currentStageStatus: ProjectStageStatus;
}
export interface AdminClientDetails extends AdminClientListItem {
    driveFolderUrl?: string;
    projectStages: ProjectStage[];
    hasProjectStageOrder: boolean;
}
export interface AdminClientPage {
    clients: AdminClientListItem[];
    page: { limit: number; hasMore: boolean; nextCursor?: string };
}
export interface UpdatedClientProjectStage { currentStageKey: ProjectStageKey; projectStages: ProjectStage[]; }
export interface BriefingReportStatus { exists: boolean; folderUrl?: string; }

export interface AdminClientsGateway {
    loadClients(session: AdminSession, cursor?: string): Promise<AdminClientPage>;
    loadClient(session: AdminSession, id: number | string): Promise<AdminClientDetails>;
    createClient(session: AdminSession, client: NewClientPayload): Promise<unknown>;
    deleteClient(session: AdminSession, clientId: string, confirmationName: string): Promise<void>;
    updateClientProjectStage(session: AdminSession, clientId: string, stageKey: ProjectStageKey, status: ProjectStageStatus): Promise<UpdatedClientProjectStage>;
    updateClientProjectStageOrder(session: AdminSession, clientId: string, stageKeys: ProjectStageKey[]): Promise<UpdatedClientProjectStage>;
    loadBriefingReportStatus(session: AdminSession, id: string): Promise<BriefingReportStatus>;
    generateBriefingReport(session: AdminSession, id: string): Promise<BriefingReportStatus>;
}

export class AdminClientsApi implements AdminClientsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }

    async loadClients(session: AdminSession, cursor?: string): Promise<AdminClientPage> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const result = await this.http.request<Partial<AdminClientPage>>(`/admin/clients${query}`, { token: session.token });
        return {
            clients: Array.isArray(result?.clients) ? result.clients : [],
            page: {
                limit: typeof result?.page?.limit === "number" ? result.page.limit : 20,
                hasMore: result?.page?.hasMore === true,
                ...(typeof result?.page?.nextCursor === "string" ? { nextCursor: result.page.nextCursor } : {})
            }
        };
    }

    async loadClient(session: AdminSession, id: number | string): Promise<AdminClientDetails> {
        const result = await this.http.request<{ client?: AdminClientDetails }>(`/admin/clients/${encodeURIComponent(id)}`, { token: session.token });
        if (!result?.client) throw new Error("Não foi possível carregar o cliente");
        return result.client;
    }

    async createClient(session: AdminSession, client: NewClientPayload): Promise<unknown> {
        const result = await this.http.request<{ client?: unknown }>("/admin/user", { method: "POST", token: session.token, json: { client } });
        return result?.client;
    }

    async deleteClient(session: AdminSession, clientId: string, confirmationName: string): Promise<void> {
        await this.http.request(`/admin/clients/${encodeURIComponent(clientId)}`, { method: "DELETE", token: session.token, json: { confirmationName } });
    }

    updateClientProjectStage(session: AdminSession, clientId: string, stageKey: ProjectStageKey, status: ProjectStageStatus): Promise<UpdatedClientProjectStage> {
        return this.stageRequest(`/admin/clients/${encodeURIComponent(clientId)}/project-stage`, session, "PATCH", { stageKey, status });
    }

    updateClientProjectStageOrder(session: AdminSession, clientId: string, stageKeys: ProjectStageKey[]): Promise<UpdatedClientProjectStage> {
        return this.stageRequest(`/admin/clients/${encodeURIComponent(clientId)}/project-stages/order`, session, "PUT", { stageKeys });
    }

    loadBriefingReportStatus(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.reportRequest(session, id, "GET");
    }

    generateBriefingReport(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.reportRequest(session, id, "POST");
    }

    private async stageRequest(path: string, session: AdminSession, method: "PATCH" | "PUT", json: unknown): Promise<UpdatedClientProjectStage> {
        const result = await this.http.request<Partial<UpdatedClientProjectStage>>(path, { method, token: session.token, json });
        if (!result?.currentStageKey || !Array.isArray(result.projectStages)) throw new Error("Não foi possível atualizar as etapas do projeto");
        return result as UpdatedClientProjectStage;
    }

    private reportRequest(session: AdminSession, id: string, method: "GET" | "POST"): Promise<BriefingReportStatus> {
        return this.http.request<BriefingReportStatus>(`/admin/clients/${encodeURIComponent(id)}/briefing-report`, { method, token: session.token });
    }
}
