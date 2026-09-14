import { httpClient, type HttpClient } from "@/shared/http/http-client.js";
import { HttpError } from "@/shared/http/http-error.js";

type AccountRole = "admin" | "client";

const storageKeys: Record<AccountRole, string> = {
    admin: "Admin-Section",
    client: "Client-Section"
};

export async function logoutSession(role: AccountRole, token: string, client: HttpClient = httpClient): Promise<void> {
    try {
        await client.request(`/${role}/logout`, {
            method: "POST",
            token,
            acceptedStatuses: [401]
        });
    } catch (error) {
        if (error instanceof HttpError) {
            console.warn(`Não foi possível confirmar a revogação da sessão ${role}.`);
        } else {
            console.warn(`Não foi possível contatar o servidor para encerrar a sessão ${role}.`, error);
        }
    } finally {
        localStorage.removeItem(storageKeys[role]);
        window.history.replaceState(null, "");
        window.location.reload();
    }
}
