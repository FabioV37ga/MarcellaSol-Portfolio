import type { Request, Response } from "express";
import { presentAdminProposal } from "../application/proposals/client-proposal.presenter.js";
import type { ClientProposalService } from "../application/client-proposal.service.js";
import type { ProposalReleaseService } from "../application/proposal-release.service.js";
import { ApplicationError } from "../application/errors/application-error.js";

export class AdminProposalsController {
    constructor(
        private readonly proposals: Pick<ClientProposalService, "list" | "create" | "edit" | "confirmChanges" | "remove" | "removeAttachment" | "find">,
        private readonly releases?: Pick<ProposalReleaseService, "releaseNow">
    ) { }

    clientProposals = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const result = await this.proposals.list(id, request.query.cursor, request.query.limit);
        return response.status(200).json({
            ...result,
            proposals: result.proposals.map(presentAdminProposal)
        });
    };

    createClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const result = await this.proposals.create(id, request.body, request.files as Express.Multer.File[] | undefined);
        return response.status(201).json({ ...result, proposal: presentAdminProposal(result.proposal) });
    };

    editClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        const proposal = await this.proposals.edit(id, proposalId, request.body, request.files as Express.Multer.File[] | undefined);
        return response.status(200).json({ proposal: presentAdminProposal(proposal) });
    };

    confirmClientProposalChanges = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        const result = await this.proposals.confirmChanges(id, proposalId);
        return response.status(200).json({ ...result, proposal: presentAdminProposal(result.proposal) });
    };

    deleteClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        await this.proposals.remove(id, proposalId);
        return response.status(204).send();
    };

    deleteClientProposalAttachment = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        const attachmentIndex = this.routeParameter(request.params.attachmentIndex);
        const proposal = await this.proposals.removeAttachment(id, proposalId, attachmentIndex);
        return response.status(200).json({ proposal: presentAdminProposal(proposal) });
    };

    releaseClientProposalNow = async (request: Request, response: Response): Promise<Response> => {
        if (!this.releases) throw new ApplicationError("Serviço de liberação de propostas indisponível", 503);
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        try {
            await this.releases.releaseNow(proposalId, id);
        } catch (error) {
            if (error instanceof Error && error.message === "PROPOSAL_RELEASE_NOT_AVAILABLE") {
                throw new ApplicationError("A proposta não está disponível para liberação", 409);
            }
            throw error;
        }
        const proposal = await this.proposals.find(id, proposalId);
        return response.status(200).json({ proposal: presentAdminProposal(proposal) });
    };

    private routeParameter(value: string | string[]): string {
        return Array.isArray(value) ? value[0] : value;
    }
}
