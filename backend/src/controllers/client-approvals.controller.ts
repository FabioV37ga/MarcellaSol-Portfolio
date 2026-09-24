import type { Request, Response } from "express";
import type { ListClientApprovalsService } from "../application/list-client-approvals.service.js";
import type { ClientProposalResponseService } from "../application/client-proposal-response.service.js";
import { presentClientProposal } from "../application/proposals/client-proposal.presenter.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class ClientApprovalsController {
    constructor(
        private readonly listApprovals: Pick<ListClientApprovalsService, "execute">,
        private readonly responses: Pick<ClientProposalResponseService, "approve" | "beat">
    ) { }

    approvals = async (request: Request, response: Response): Promise<Response> => {
        return response.status(200).json(await this.listApprovals.execute(
            authenticatedPrincipal(response).subject,
            request.query.cursor,
            request.query.limit
        ));
    };

    approveProposal = async (request: Request, response: Response): Promise<Response> => {
        const result = await this.responses.approve(
            authenticatedPrincipal(response).subject,
            String(request.params.proposalId ?? ""),
            request.body?.comment,
            request.files as Express.Multer.File[] | undefined
        );
        return response.status(200).json({
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages,
            proposal: presentClientProposal(result.proposal)
        });
    };

    beatProposal = async (request: Request, response: Response): Promise<Response> => {
        const result = await this.responses.beat(
            authenticatedPrincipal(response).subject,
            String(request.params.proposalId ?? ""),
            request.body?.comment,
            request.body?.confirmRevisionRound === true || request.body?.confirmRevisionRound === "true",
            request.files as Express.Multer.File[] | undefined
        );
        return response.status(200).json({
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages,
            proposal: presentClientProposal(result.proposal)
        });
    };
}
