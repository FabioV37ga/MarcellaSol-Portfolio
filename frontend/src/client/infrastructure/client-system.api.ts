import { config } from "@/utils/connection.js";
import type { ClientBriefingResponse } from "@/shared/briefing/briefing.types.js";
import type { DbView } from "../templates/interface.js";
import { ClientPaymentsApi, type ClientPaymentsGateway, type ClientPaymentPage, type ClientPixResponse } from "./payments.api.js";
export type { ClientPayment, ClientPaymentInstallment, ClientPaymentPage, ClientPaymentPart, ClientPixResponse } from "./payments.api.js";
import { ClientProposalsApi, type ClientProposalsGateway, type ClientProjectResponse, type ClientProposalDecision } from "./proposals.api.js";
export type { ClientProjectResponse, ClientProposal, ClientProposalDecision, ClientProposalResponse, ClientProposalStatus } from "./proposals.api.js";

export type ClientSystemResponse = { view: DbView[] } & ClientBriefingResponse;

export class ClientSystemApi {
    constructor(
        private readonly payments: ClientPaymentsGateway = new ClientPaymentsApi(),
        private readonly proposals: ClientProposalsGateway = new ClientProposalsApi()
    ) { }

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
        return this.proposals.loadProposals(token);
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
        return this.proposals.approveProposal(token, proposalId, comment, files);
    }

    beatProposal(
        token: string,
        proposalId: string,
        comment: string,
        confirmRevisionRound: boolean,
        files: File[] = []
    ): Promise<ClientProposalDecision> {
        return this.proposals.beatProposal(token, proposalId, comment, confirmRevisionRound, files);
    }
}
