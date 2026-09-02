import mongoose from "mongoose";
import {
    isProjectStageKey,
    isProjectStageStatus,
    normalizedProjectStages,
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
}
