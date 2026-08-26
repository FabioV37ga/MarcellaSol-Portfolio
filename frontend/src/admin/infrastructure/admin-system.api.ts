import { config } from "@/utils/connection.js";
import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { dbView } from "../templates/interface.js";

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
}

export interface BriefingReportStatus {
    exists: boolean;
    folderUrl?: string;
}

export class AdminSystemApi {
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
