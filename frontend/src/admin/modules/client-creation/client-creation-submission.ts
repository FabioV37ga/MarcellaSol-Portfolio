import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";

export class ClientCreationSubmission {
    private submitting = false;

    constructor(
        private readonly clients: Pick<AdminClientsGateway, "createClient">,
        private readonly session: AdminSession,
        private readonly onCreated: () => void
    ) { }

    async submit(client: NewClientPayload): Promise<void> {
        if (this.submitting) return;
        const button = document.querySelector<HTMLButtonElement>("#briefing-finish-confirm");
        this.submitting = true;
        if (button) button.disabled = true;
        try {
            await this.clients.createClient(this.session, client);
            this.onCreated();
        } catch (error) {
            console.error("Erro ao criar cliente:", error);
            if (button) button.disabled = false;
        } finally {
            this.submitting = false;
        }
    }
}
