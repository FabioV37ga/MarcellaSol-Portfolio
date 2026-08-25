import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";

export interface AdminClientListItem {
    id: string;
    name: string;
    type: string;
    hasFilledBriefing: boolean;
}

export class ListClientsService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly briefings = new ClientBriefingRepository()
    ) {}

    async execute(): Promise<AdminClientListItem[]> {
        const clients = await this.clients.findAllForAdmin();
        const clientBriefings = await this.briefings.findByClientIds(
            clients.map(client => client._id)
        );
        const typeByClientId = new Map(
            clientBriefings.map(briefing => [
                briefing.clientId.toString(),
                this.getPropertyType(briefing.briefingDefinition)
            ])
        );

        return clients.map(client => ({
            id: client._id.toString(),
            name: client.name,
            type: typeByClientId.get(client._id.toString()) ?? "Não informado",
            hasFilledBriefing: client.hasFilledBriefing
        }));
    }

    private getPropertyType(definition: Record<string, unknown>): string {
        const description = definition.description;
        if (!description || typeof description !== "object") return "Não informado";

        const type = (description as Record<string, unknown>).type;
        return typeof type === "string" && type.trim() ? type : "Não informado";
    }
}
