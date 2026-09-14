import type { ClientBriefingResponse } from "@/shared/briefing/briefing.types.js";
import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import type { DbView } from "../templates/interface.js";

export type ClientSystemResponse = { view: DbView[] } & ClientBriefingResponse;
export interface ClientViewsGateway { load(token: string): Promise<ClientSystemResponse | undefined>; }
export class ClientViewsApi implements ClientViewsGateway {
    constructor(private readonly http: HttpClient = httpClient) { }
    async load(token: string): Promise<ClientSystemResponse | undefined> {
        return this.http.request<ClientSystemResponse>("/view/client", {
            method: "POST", token, json: {}, acceptedStatuses: [401, 403]
        });
    }
}
