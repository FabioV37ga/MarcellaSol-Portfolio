import { config } from "@/utils/connection.js";

type AccountRole = "admin" | "client";

const storageKeys: Record<AccountRole, string> = {
    admin: "Admin-Section",
    client: "Client-Section"
};

export async function logoutSession(role: AccountRole, token: string): Promise<void> {
    try {
        const response = await fetch(`${config.apiBaseUrl}/${role}/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok && response.status !== 401) {
            console.warn(`Não foi possível confirmar a revogação da sessão ${role}.`);
        }
    } catch (error) {
        console.warn(`Não foi possível contatar o servidor para encerrar a sessão ${role}.`, error);
    } finally {
        localStorage.removeItem(storageKeys[role]);
        window.location.reload();
    }
}
