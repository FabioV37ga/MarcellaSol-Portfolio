import { config } from "@/utils/connection.js";
import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { dbView } from "../templates/interface.js";

export interface AdminSession {
    token: string;
}

export class AdminSystemApi {
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
