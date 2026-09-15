import type { Request, Response } from "express";
import type { ClientProposalService } from "../application/client-proposal.service.js";

export class AdminProposalsController {
    constructor(private readonly proposals: Pick<ClientProposalService, "list" | "create" | "edit" | "resend" | "remove" | "removeAttachment">) { }

    clientProposals = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        return response.status(200).json({ proposals: await this.proposals.list(id) });
    };

    createClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const result = await this.proposals.create(id, request.body, request.files as Express.Multer.File[] | undefined);
        return response.status(201).json(result);
    };

    editClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        const proposal = await this.proposals.edit(id, proposalId, request.body, request.files as Express.Multer.File[] | undefined);
        return response.status(200).json({ proposal });
    };

    resendClientProposal = async (request: Request, response: Response): Promise<Response> => {
        const id = this.routeParameter(request.params.id);
        const proposalId = this.routeParameter(request.params.proposalId);
        const result = await this.proposals.resend(id, proposalId);
        return response.status(200).json(result);
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
        return response.status(200).json({ proposal });
    };

    private routeParameter(value: string | string[]): string {
        return Array.isArray(value) ? value[0] : value;
    }
}
