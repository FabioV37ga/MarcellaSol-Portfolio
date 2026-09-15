import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { ProjectStageKey, ProjectStageStatus } from "@/shared/project-stages.js";
import { AdminClientsApi, type AdminClientsGateway, type AdminClientDetails, type AdminClientListItem, type BriefingReportStatus, type UpdatedClientProjectStage } from "./clients.api.js";
import { AdminPaymentsApi, type AdminPaymentsGateway, type ClientPayment, type PaymentFields, type PaymentPage, type PaymentPreview, type PaymentPreviewFields } from "./payments.api.js";
import { AdminProposalsApi, type AdminProposalsGateway, type ClientProposal, type ProposalFields, type ProposalStageMutation } from "./proposals.api.js";
import { AdminViewsApi, type AdminViewsGateway } from "./views.api.js";
import type { dbView } from "../templates/interface.js";

export type { AdminClientDetails, AdminClientListItem, BriefingReportStatus, UpdatedClientProjectStage } from "./clients.api.js";
export type { ClientPayment, PaymentFields, PaymentInstallment, PaymentPage, PaymentPart, PaymentPreview, PaymentPreviewFields } from "./payments.api.js";
export type { ClientProposal, ProposalFields, ProposalStageMutation, ProposalStatus } from "./proposals.api.js";
export interface AdminSession { token: string; }

export class AdminSystemApi implements AdminClientsGateway, AdminPaymentsGateway, AdminProposalsGateway, AdminViewsGateway {
    constructor(
        private readonly payments: AdminPaymentsGateway = new AdminPaymentsApi(),
        private readonly proposals: AdminProposalsGateway = new AdminProposalsApi(),
        private readonly clients: AdminClientsGateway = new AdminClientsApi(),
        private readonly views: AdminViewsGateway = new AdminViewsApi()
    ) { }

    loadPayments(s: AdminSession, id: string, cursor?: string): Promise<PaymentPage> { return this.payments.loadPayments(s, id, cursor); }
    previewPayment(s: AdminSession, fields: PaymentPreviewFields, signal?: AbortSignal): Promise<PaymentPreview> { return this.payments.previewPayment(s, fields, signal); }
    createPayment(s: AdminSession, id: string, fields: PaymentFields): Promise<ClientPayment> { return this.payments.createPayment(s, id, fields); }
    editPayment(s: AdminSession, id: string, paymentId: string, fields: PaymentFields): Promise<ClientPayment> { return this.payments.editPayment(s, id, paymentId, fields); }
    removePayment(s: AdminSession, id: string, paymentId: string, version: number, confirmed: boolean): Promise<void> { return this.payments.removePayment(s, id, paymentId, version, confirmed); }
    setDownPaymentPaid(s: AdminSession, id: string, paymentId: string, paid: boolean, version: number): Promise<ClientPayment> { return this.payments.setDownPaymentPaid(s, id, paymentId, paid, version); }
    setInstallmentPaid(s: AdminSession, id: string, paymentId: string, number: number, paid: boolean, version: number): Promise<ClientPayment> { return this.payments.setInstallmentPaid(s, id, paymentId, number, paid, version); }
    loadProposals(s: AdminSession, id: string): Promise<ClientProposal[]> { return this.proposals.loadProposals(s, id); }
    createProposal(s: AdminSession, id: string, fields: ProposalFields): Promise<ProposalStageMutation> { return this.proposals.createProposal(s, id, fields); }
    editProposal(s: AdminSession, id: string, proposalId: string, fields: ProposalFields): Promise<ClientProposal> { return this.proposals.editProposal(s, id, proposalId, fields); }
    confirmProposalChanges(s: AdminSession, id: string, proposalId: string): Promise<ProposalStageMutation> { return this.proposals.confirmProposalChanges(s, id, proposalId); }
    deleteProposal(s: AdminSession, id: string, proposalId: string): Promise<void> { return this.proposals.deleteProposal(s, id, proposalId); }
    deleteProposalAttachment(s: AdminSession, id: string, proposalId: string, index: number): Promise<ClientProposal> { return this.proposals.deleteProposalAttachment(s, id, proposalId, index); }
    loadClients(s: AdminSession): Promise<AdminClientListItem[]> { return this.clients.loadClients(s); }
    loadClient(s: AdminSession, id: number | string): Promise<AdminClientDetails> { return this.clients.loadClient(s, id); }
    createClient(s: AdminSession, client: NewClientPayload): Promise<unknown> { return this.clients.createClient(s, client); }
    deleteClient(s: AdminSession, id: string, name: string): Promise<void> { return this.clients.deleteClient(s, id, name); }
    updateClientProjectStage(s: AdminSession, id: string, key: ProjectStageKey, status: ProjectStageStatus): Promise<UpdatedClientProjectStage> { return this.clients.updateClientProjectStage(s, id, key, status); }
    updateClientProjectStageOrder(s: AdminSession, id: string, keys: ProjectStageKey[]): Promise<UpdatedClientProjectStage> { return this.clients.updateClientProjectStageOrder(s, id, keys); }
    loadBriefingReportStatus(s: AdminSession, id: string): Promise<BriefingReportStatus> { return this.clients.loadBriefingReportStatus(s, id); }
    generateBriefingReport(s: AdminSession, id: string): Promise<BriefingReportStatus> { return this.clients.generateBriefingReport(s, id); }
    loadViews(s: AdminSession): Promise<dbView[] | undefined> { return this.views.loadViews(s); }
}
