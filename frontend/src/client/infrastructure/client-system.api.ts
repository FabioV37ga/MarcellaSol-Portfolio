import { ClientPaymentsApi, type ClientPaymentsGateway, type ClientPaymentPage, type ClientPixResponse } from "./payments.api.js";
import { ClientProposalsApi, type ClientProposalsGateway, type ClientProjectResponse, type ClientProposalDecision } from "./proposals.api.js";
import { ClientViewsApi, type ClientViewsGateway, type ClientSystemResponse } from "./views.api.js";

export type { ClientPayment, ClientPaymentInstallment, ClientPaymentPage, ClientPaymentPart, ClientPixResponse } from "./payments.api.js";
export type { ClientProjectResponse, ClientProposal, ClientProposalDecision, ClientProposalResponse, ClientProposalStatus } from "./proposals.api.js";
export type { ClientSystemResponse } from "./views.api.js";

export class ClientSystemApi implements ClientPaymentsGateway, ClientProposalsGateway, ClientViewsGateway {
    constructor(
        private readonly payments: ClientPaymentsGateway = new ClientPaymentsApi(),
        private readonly proposals: ClientProposalsGateway = new ClientProposalsApi(),
        private readonly views: ClientViewsGateway = new ClientViewsApi()
    ) { }
    load(token: string): Promise<ClientSystemResponse | undefined> { return this.views.load(token); }
    loadProposals(token: string): Promise<ClientProjectResponse> { return this.proposals.loadProposals(token); }
    loadPayments(token: string, cursor?: string): Promise<ClientPaymentPage> { return this.payments.loadPayments(token, cursor); }
    generatePaymentPix(token: string, id: string, type: "down-payment" | "installment", number?: number): Promise<ClientPixResponse> { return this.payments.generatePaymentPix(token, id, type, number); }
    approveProposal(token: string, id: string, comment: string, files: File[] = []): Promise<ClientProposalDecision> { return this.proposals.approveProposal(token, id, comment, files); }
    beatProposal(token: string, id: string, comment: string, confirmed: boolean, files: File[] = []): Promise<ClientProposalDecision> { return this.proposals.beatProposal(token, id, comment, confirmed, files); }
}
