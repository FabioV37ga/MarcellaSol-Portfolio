import { config } from "@/utils/connection.js";
import type { ClientBriefingResponse } from "@/shared/briefing/briefing.types.js";
import type { DbView } from "../templates/interface.js";
import type { ProjectStage, ProjectStageKey } from "@/shared/project-stages.js";
import { ClientPaymentsApi, type ClientPaymentsGateway, type ClientPaymentPage, type ClientPixResponse } from "./payments.api.js";
export type { ClientPayment, ClientPaymentInstallment, ClientPaymentPage, ClientPaymentPart, ClientPixResponse } from "./payments.api.js";

export type ClientSystemResponse = { view: DbView[] } & ClientBriefingResponse;

export type ClientProposalStatus = "sent" | "beated" | "resent" | "approved" | "Cancelled";

export interface ClientProposalResponse {
    decision: "approved" | "beated";
    comment: string;
    attachments: string[];
    createdAt: string;
}

export interface ClientProposal {
    _id: string;
    title: string;
    description: string;
    attachments: string[];
    userComment: string;
    clientResponses: ClientProposalResponse[];
    stageKey?: ProjectStageKey;
    status: ClientProposalStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ClientProjectResponse {
    proposals: ClientProposal[];
    projectStages: ProjectStage[];
    currentStageKey: ProjectStageKey;
}

export interface ClientProposalDecision {
    proposal: ClientProposal;
    projectStages: ProjectStage[];
    currentStageKey: ProjectStageKey;
}

export class ClientSystemApi {
    constructor(private readonly payments: ClientPaymentsGateway = new ClientPaymentsApi()) { }

    async load(token: string): Promise<ClientSystemResponse | undefined> {
        const response = await fetch(`${config.apiBaseUrl}/view/client`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) return undefined;
        return response.json() as Promise<ClientSystemResponse>;
    }

    async loadProposals(token: string): Promise<ClientProjectResponse> {
        const response = await fetch(`${config.apiBaseUrl}/client/proposals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            proposals?: ClientProposal[];
            projectStages?: ProjectStage[];
            currentStageKey?: ProjectStageKey;
            message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar as aprovações.");
        return {
            proposals: result.proposals ?? [],
            projectStages: result.projectStages ?? [],
            currentStageKey: result.currentStageKey ?? "briefing"
        };
    }

    loadPayments(token: string, cursor?: string): Promise<ClientPaymentPage> {
        return this.payments.loadPayments(token, cursor);
    }

    generatePaymentPix(
        token: string,
        paymentId: string,
        partType: "down-payment" | "installment",
        installmentNumber?: number
    ): Promise<ClientPixResponse> {
        return this.payments.generatePaymentPix(token, paymentId, partType, installmentNumber);
    }

    approveProposal(token: string, proposalId: string, comment: string, files: File[] = []): Promise<ClientProposalDecision> {
        return this.decideProposal(token, proposalId, "approve", comment, undefined, files);
    }

    beatProposal(
        token: string,
        proposalId: string,
        comment: string,
        confirmRevisionRound: boolean,
        files: File[] = []
    ): Promise<ClientProposalDecision> {
        return this.decideProposal(token, proposalId, "beat", comment, confirmRevisionRound, files);
    }

    private async decideProposal(
        token: string,
        proposalId: string,
        decision: "approve" | "beat",
        comment?: string,
        confirmRevisionRound?: boolean,
        files: File[] = []
    ): Promise<ClientProposalDecision> {
        const body = new FormData();
        if (comment !== undefined) body.set("comment", comment);
        if (confirmRevisionRound !== undefined) body.set("confirmRevisionRound", String(confirmRevisionRound));
        files.forEach(file => body.append("attachments", file, file.name));
        const response = await fetch(
            `${config.apiBaseUrl}/client/proposals/${encodeURIComponent(proposalId)}/${decision}`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body
            }
        );
        const result = await response.json().catch(() => ({})) as {
            proposal?: ClientProposal;
            projectStages?: ProjectStage[];
            currentStageKey?: ProjectStageKey;
            message?: string;
        };
        if (!response.ok || !result.proposal || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(result.message ?? "Não foi possível registrar sua decisão.");
        }
        return {
            proposal: result.proposal,
            projectStages: result.projectStages,
            currentStageKey: result.currentStageKey
        };
    }
}
