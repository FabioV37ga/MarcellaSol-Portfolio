import type { ClientProposalObject } from "../../models/clientProposal.js";

type ProposalSource = Pick<ClientProposalObject,
    "_id" | "title" | "description" | "userComment" | "stageKey" | "status" | "createdAt" | "updatedAt"
> & Partial<Pick<ClientProposalObject, "attachments" | "attachment" | "clientResponses">>;

export function presentClientProposal(proposal: ProposalSource) {
    return {
        _id: proposal._id,
        title: proposal.title,
        description: proposal.description,
        attachments: proposal.attachments?.length
            ? proposal.attachments
            : proposal.attachment ? [proposal.attachment] : [],
        userComment: proposal.userComment,
        clientResponses: proposal.clientResponses ?? [],
        stageKey: proposal.stageKey,
        status: proposal.status,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt
    };
}
