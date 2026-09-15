import type { ClientProposalService } from "./client-proposal.service.js";
import { ApplicationError } from "./errors/application-error.js";
import { presentClientProposal } from "./proposals/client-proposal.presenter.js";
import { normalizedProjectStages, type ProjectStage, type ProjectStageKey } from "../models/projectStage.js";

interface ClientApprovalReader {
    findById(id: string): PromiseLike<{
        currentStageKey?: ProjectStageKey;
        projectStages?: ProjectStage[];
        hasFilledBriefing: boolean;
    } | null>;
}

export class ListClientApprovalsService {
    constructor(
        private readonly clients: ClientApprovalReader,
        private readonly proposals: Pick<ClientProposalService, "list">
    ) { }

    async execute(clientId: string) {
        const [proposals, client] = await Promise.all([
            this.proposals.list(clientId),
            this.clients.findById(clientId)
        ]);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);
        return {
            currentStageKey: client.currentStageKey ?? "briefing",
            projectStages: normalizedProjectStages(client.projectStages, client.hasFilledBriefing),
            proposals: proposals.map(presentClientProposal)
        };
    }
}
