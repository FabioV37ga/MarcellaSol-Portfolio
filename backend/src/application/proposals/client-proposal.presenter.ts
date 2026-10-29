import type { ClientProposalObject } from "../../models/clientProposal.js";

type ProposalSource = Pick<ClientProposalObject,
    "_id" | "title" | "description" | "userComment" | "stageKey" | "status" | "createdAt" | "updatedAt"
> & Partial<Pick<ClientProposalObject, "attachments" | "attachment" | "clientResponses" | "release">>;

export function presentClientProposal(proposal: ProposalSource) {
    const attachments = proposal.attachments?.length
        ? proposal.attachments
        : proposal.attachment ? [proposal.attachment] : [];
    const attachmentsAvailable = !proposal.release || proposal.release.status === "released";
    return {
        _id: proposal._id,
        title: proposal.title,
        description: proposal.description,
        attachments: attachmentsAvailable ? attachments : [],
        attachmentCount: attachments.length,
        attachmentsAvailable,
        ...(proposal.release ? {
            releaseAt: proposal.release.scheduledAt,
            releaseStatus: proposal.release.status,
            releasedAt: proposal.release.releasedAt
        } : {}),
        userComment: proposal.userComment,
        clientResponses: proposal.clientResponses ?? [],
        stageKey: proposal.stageKey,
        status: proposal.status,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt
    };
}

export function presentAdminProposal(proposal: ProposalSource) {
    const attachments = proposal.attachments?.length
        ? proposal.attachments
        : proposal.attachment ? [proposal.attachment] : [];
    return {
        _id: proposal._id,
        title: proposal.title,
        description: proposal.description,
        attachments,
        attachmentCount: attachments.length,
        attachmentsAvailable: !proposal.release || proposal.release.status === "released",
        userComment: proposal.userComment,
        clientResponses: proposal.clientResponses ?? [],
        stageKey: proposal.stageKey,
        status: proposal.status,
        ...(proposal.release ? {
            releaseAt: proposal.release.scheduledAt,
            releaseStatus: proposal.release.status,
            releasedAt: proposal.release.releasedAt
        } : {}),
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt
    };
}
