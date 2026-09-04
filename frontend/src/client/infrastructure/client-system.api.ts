import { config } from "@/utils/connection.js";
import type { ClientBriefingResponse } from "@/shared/briefing/briefing.types.js";
import type { DbView } from "../templates/interface.js";
import type { ProjectStage, ProjectStageKey } from "@/shared/project-stages.js";

export type ClientSystemResponse = { view: DbView[] } & ClientBriefingResponse;

export type ClientProposalStatus = "sent" | "beated" | "resent" | "approved" | "Cancelled";

export interface ClientProposal {
    _id: string;
    title: string;
    description: string;
    attachments: string[];
    userComment: string;
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

export interface ClientPaymentPart {
    amountCents: number;
    isPaid: boolean;
    dueDate?: string;
    pix?: { generatedAt: string; expiresAt: string };
}

export interface ClientPaymentInstallment extends ClientPaymentPart {
    number: number;
}

export interface ClientPayment {
    id: string;
    title: string;
    totalAmountCents: number;
    installmentCount: number;
    firstDueDate?: string;
    downPaymentPercentage: number;
    discountPercentage: number;
    interestPercentage: number;
    discountAmountCents: number;
    downPayment: ClientPaymentPart;
    finalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
    installments: ClientPaymentInstallment[];
    createdAt: string;
    updatedAt: string;
}

export interface ClientPixResponse {
    payment: ClientPayment;
    pix: {
        partType: "down-payment" | "installment";
        installmentNumber?: number;
        amountCents: number;
        brCode: string;
        qrCodeDataUrl: string;
        generatedAt: string;
        expiresAt: string;
    };
}

export class ClientSystemApi {
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

    async loadPayments(token: string): Promise<ClientPayment[]> {
        const response = await fetch(`${config.apiBaseUrl}/client/payments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            payments?: ClientPayment[];
            message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar os pagamentos.");
        return result.payments ?? [];
    }

    async generatePaymentPix(
        token: string,
        paymentId: string,
        partType: "down-payment" | "installment",
        installmentNumber?: number
    ): Promise<ClientPixResponse> {
        const response = await fetch(`${config.apiBaseUrl}/client/payments/${encodeURIComponent(paymentId)}/pix`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ partType, ...(installmentNumber === undefined ? {} : { installmentNumber }) })
        });
        const result = await response.json().catch(() => ({})) as Partial<ClientPixResponse> & { message?: string };
        if (!response.ok || !result.payment || !result.pix) {
            throw new Error(result.message ?? "Não foi possível gerar o código Pix.");
        }
        return result as ClientPixResponse;
    }

    approveProposal(token: string, proposalId: string, comment: string): Promise<ClientProposalDecision> {
        return this.decideProposal(token, proposalId, "approve", comment);
    }

    beatProposal(
        token: string,
        proposalId: string,
        comment: string,
        confirmRevisionRound: boolean
    ): Promise<ClientProposalDecision> {
        return this.decideProposal(token, proposalId, "beat", comment, confirmRevisionRound);
    }

    private async decideProposal(
        token: string,
        proposalId: string,
        decision: "approve" | "beat",
        comment?: string,
        confirmRevisionRound?: boolean
    ): Promise<ClientProposalDecision> {
        const response = await fetch(
            `${config.apiBaseUrl}/client/proposals/${encodeURIComponent(proposalId)}/${decision}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...(comment === undefined ? {} : { comment }),
                    ...(confirmRevisionRound === undefined ? {} : { confirmRevisionRound })
                })
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
