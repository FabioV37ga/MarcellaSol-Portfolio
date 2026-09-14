import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import type { dbView } from "../templates/interface.js";
import type { AdminSession } from "./admin-system.api.js";

export interface AdminViewsGateway { loadViews(session: AdminSession): Promise<dbView[] | undefined>; }
export class AdminViewsApi implements AdminViewsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }
    async loadViews(session: AdminSession): Promise<dbView[] | undefined> {
        const result = await this.http.request<{ view?: dbView[] }>("/view/admin", {
            method: "POST", token: session.token, json: {}, acceptedStatuses: [401, 403]
        });
        return result?.view;
    }
}
