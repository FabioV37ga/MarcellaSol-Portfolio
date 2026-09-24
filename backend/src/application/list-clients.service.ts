import mongoose from "mongoose";
import { ApplicationError } from "./errors/application-error.js";
import type {
    BriefingListingRepository,
    ClientListingRepository
} from "./ports/client-listing.repositories.js";
import { clientPageOptions, encodeClientCursor } from "./pagination/client-list-pagination.js";
import {
    hasConfiguredProjectStageOrder,
    isProjectStageKey,
    normalizedProjectStages,
    type ProjectStage,
    type ProjectStageKey,
    type ProjectStageStatus
} from "../models/projectStage.js";

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

export class ListClientsService {
    constructor(
        private readonly clients: ClientListingRepository,
        private readonly briefings: BriefingListingRepository
    ) { }

    async execute(cursorValue?: unknown, limitValue?: unknown): Promise<AdminClientPage> {
        const options = clientPageOptions(cursorValue, limitValue);
        const result = await this.clients.findPageForAdmin(options);
        const clients = result.records;
        const clientBriefings = await this.briefings.findByClientIds(
            clients.map(client => client._id)
        );
        const typeByClientId = new Map(
            clientBriefings.map(briefing => [
                briefing.clientId.toString(),
                this.getPropertyType(briefing.briefingDefinition)
            ])
        );

        const items = clients.map(client => {
            const projectStages = normalizedProjectStages(client.projectStages, client.hasFilledBriefing);
            const currentStageKey = isProjectStageKey(client.currentStageKey)
                && client.currentStageKey !== "contract" ? client.currentStageKey : "briefing";
            const currentStageStatus = projectStages.find(stage => stage.key === currentStageKey)?.status
                ?? "not-started";

            return {
                id: client._id.toString(),
                name: client.name,
                type: typeByClientId.get(client._id.toString()) ?? "Não informado",
                hasFilledBriefing: client.hasFilledBriefing,
                currentStageKey,
                currentStageStatus
            };
        });
        const last = clients[clients.length - 1];
        return {
            clients: items,
            page: {
                limit: options.limit,
                hasMore: result.hasMore,
                ...(result.hasMore && last ? { nextCursor: encodeClientCursor(last._id) } : {})
            }
        };
    }

    async executeOne(id: string): Promise<AdminClientDetails> {
        if (!mongoose.isValidObjectId(id)) throw new ApplicationError("Cliente não encontrado", 404);

        const client = await this.clients.findByIdForAdmin(id);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);

        const briefing = await this.briefings.findByClientIdForAdmin(client._id);
        const driveFolderId = client.driveFolderId?.trim();
        const projectStages = normalizedProjectStages(client.projectStages, client.hasFilledBriefing);
        const currentStageKey = isProjectStageKey(client.currentStageKey)
            && client.currentStageKey !== "contract" ? client.currentStageKey : "briefing";

        return {
            id: client._id.toString(),
            name: client.name,
            type: briefing ? this.getPropertyType(briefing.briefingDefinition) : "Não informado",
            hasFilledBriefing: client.hasFilledBriefing,
            currentStageKey,
            currentStageStatus: projectStages.find(stage => stage.key === currentStageKey)?.status ?? "not-started",
            projectStages,
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
