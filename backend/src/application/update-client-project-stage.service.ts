import mongoose from "mongoose";
import {
    isProjectStageKey,
    isProjectStageStatus,
    normalizedProjectStages,
    projectStageKeys,
    projectStagesWithOrder,
    type ProjectStage,
    type ProjectStageKey,
    type ProjectStageStatus
} from "../models/projectStage.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ApplicationError } from "./errors/application-error.js";

export interface UpdatedClientProjectStage {
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

export class UpdateClientProjectStageService {
    constructor(private readonly clients = new ClientRepository()) {}

    async execute(clientId: string, stageKey: unknown, status: unknown): Promise<UpdatedClientProjectStage> {
        if (!mongoose.isValidObjectId(clientId)) throw new ApplicationError("Cliente não encontrado", 404);
        if (!isProjectStageKey(stageKey)) throw new ApplicationError("Etapa do projeto inválida", 400);
        if (!isProjectStageStatus(status)) throw new ApplicationError("Status da etapa inválido", 400);
        if (stageKey === "contract") {
            throw new ApplicationError("A etapa Contrato é concluída automaticamente", 400);
        }

        const client = await this.clients.findByIdForAdmin(clientId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);

        const projectStages = normalizedProjectStages(
            client.projectStages,
            client.hasFilledBriefing
        ).map(stage => stage.key === stageKey ? { ...stage, status: status as ProjectStageStatus } : stage);
        const updated = await this.clients.updateProjectStageState(clientId, stageKey, projectStages);
        if (!updated) throw new ApplicationError("Cliente não encontrado", 404);

        return { currentStageKey: stageKey, projectStages };
    }

    async updateOrder(clientId: string, stageKeys: unknown): Promise<UpdatedClientProjectStage> {
        if (!mongoose.isValidObjectId(clientId)) throw new ApplicationError("Cliente não encontrado", 404);
        if (!this.isValidOrder(stageKeys)) {
            throw new ApplicationError("Ordem das etapas inválida", 400);
        }
        if (stageKeys[0] !== "contract" || stageKeys[1] !== "briefing") {
            throw new ApplicationError("Contrato e Briefing devem ser as duas primeiras etapas", 400);
        }

        const client = await this.clients.findByIdForAdmin(clientId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);

        const projectStages = projectStagesWithOrder(
            client.projectStages,
            client.hasFilledBriefing,
            stageKeys
        );
        const currentStageKey = isProjectStageKey(client.currentStageKey)
            && client.currentStageKey !== "contract" ? client.currentStageKey : "briefing";
        const updated = await this.clients.updateProjectStageState(clientId, currentStageKey, projectStages);
        if (!updated) throw new ApplicationError("Cliente não encontrado", 404);

        return { currentStageKey, projectStages };
    }

    private isValidOrder(value: unknown): value is ProjectStageKey[] {
        return Array.isArray(value)
            && value.length === projectStageKeys.length
            && value.every(isProjectStageKey)
            && new Set(value).size === projectStageKeys.length;
    }
}
