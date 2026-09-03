import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import mongoose from "mongoose";
import { ApplicationError } from "./errors/application-error.js";
import {
    hasConfiguredProjectStageOrder,
    normalizedProjectStages,
    type ProjectStage,
    type ProjectStageKey
} from "../models/projectStage.js";

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

    async executeOne(id: string): Promise<AdminClientDetails> {
        if (!mongoose.isValidObjectId(id)) throw new ApplicationError("Cliente não encontrado", 404);

        const client = await this.clients.findByIdForAdmin(id);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);

        const briefing = await this.briefings.findByClientIdForAdmin(client._id);
        const driveFolderId = client.driveFolderId?.trim();

        return {
            id: client._id.toString(),
            name: client.name,
            type: briefing ? this.getPropertyType(briefing.briefingDefinition) : "Não informado",
            hasFilledBriefing: client.hasFilledBriefing,
            currentStageKey: client.currentStageKey ?? "briefing",
            projectStages: normalizedProjectStages(client.projectStages, client.hasFilledBriefing),
            hasProjectStageOrder: hasConfiguredProjectStageOrder(client.projectStages),
            driveFolderUrl: driveFolderId
                ? `https://drive.google.com/drive/folders/${encodeURIComponent(driveFolderId)}`
                : undefined
        };
    }

    private getPropertyType(definition: Record<string, unknown>): string {
        const description = definition.description;
        if (!description || typeof description !== "object") return "Não informado";

        const type = (description as Record<string, unknown>).type;
        return typeof type === "string" && type.trim() ? type : "Não informado";
    }
}
