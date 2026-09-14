import { config } from "@/utils/connection.js";
import type { NewClientPayload } from "@/shared/briefing/briefing.types.js";
import type { dbView } from "../templates/interface.js";
import type { ProjectStage, ProjectStageKey, ProjectStageStatus } from "@/shared/project-stages.js";
import { AdminPaymentsApi, type AdminPaymentsGateway, type ClientPayment, type PaymentFields, type PaymentPage, type PaymentPreview, type PaymentPreviewFields } from "./payments.api.js";
export type { ClientPayment, PaymentFields, PaymentInstallment, PaymentPage, PaymentPart, PaymentPreview, PaymentPreviewFields } from "./payments.api.js";
import { AdminProposalsApi, type AdminProposalsGateway, type ClientProposal, type ProposalFields, type ProposalStageMutation } from "./proposals.api.js";
export type { ClientProposal, ProposalFields, ProposalStageMutation, ProposalStatus } from "./proposals.api.js";

export interface AdminSession {
    token: string;
}

export interface AdminClientListItem {
    id: string;
    name: string;
    type: string;
    hasFilledBriefing: boolean;
    currentStageKey: ProjectStageKey;
    currentStageStatus: ProjectStageStatus;
}

export interface AdminClientDetails extends AdminClientListItem {
    driveFolderUrl?: string;
    projectStages: ProjectStage[];
    hasProjectStageOrder: boolean;
}

export interface UpdatedClientProjectStage {
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

export interface BriefingReportStatus {
    exists: boolean;
    folderUrl?: string;
}

export class AdminSystemApi {
    constructor(
        private readonly payments: AdminPaymentsGateway = new AdminPaymentsApi(),
        private readonly proposals: AdminProposalsGateway = new AdminProposalsApi()
    ) { }

    private authorization(session: AdminSession): HeadersInit {
        return { Authorization: `Bearer ${session.token}` };
    }

    loadPayments(session: AdminSession, clientId: string, cursor?: string): Promise<PaymentPage> {
        return this.payments.loadPayments(session, clientId, cursor);
    }

    previewPayment(
        session: AdminSession,
        fields: PaymentPreviewFields,
        signal?: AbortSignal
    ): Promise<PaymentPreview> {
        return this.payments.previewPayment(session, fields, signal);
    }

    async createPayment(session: AdminSession, clientId: string, fields: PaymentFields): Promise<ClientPayment> {
        return this.payments.createPayment(session, clientId, fields);
    }

    async editPayment(
        session: AdminSession,
        clientId: string,
        paymentId: string,
        fields: PaymentFields
    ): Promise<ClientPayment> {
        return this.payments.editPayment(session, clientId, paymentId, fields);
    }

    removePayment(
        session: AdminSession,
        clientId: string,
        paymentId: string,
        version: number,
        confirmedReceiptHistoryAcknowledged: boolean
    ): Promise<void> {
        return this.payments.removePayment(session, clientId, paymentId, version, confirmedReceiptHistoryAcknowledged);
    }

    async setDownPaymentPaid(
        session: AdminSession,
        clientId: string,
        paymentId: string,
        isPaid: boolean,
        version: number
    ): Promise<ClientPayment> {
        return this.payments.setDownPaymentPaid(session, clientId, paymentId, isPaid, version);
    }

    async setInstallmentPaid(
        session: AdminSession,
        clientId: string,
        paymentId: string,
        installmentNumber: number,
        isPaid: boolean,
        version: number
    ): Promise<ClientPayment> {
        return this.payments.setInstallmentPaid(session, clientId, paymentId, installmentNumber, isPaid, version);
    }

    async loadProposals(session: AdminSession, userId: string): Promise<ClientProposal[]> {
        return this.proposals.loadProposals(session, userId);
    }

    async createProposal(session: AdminSession, userId: string, fields: ProposalFields): Promise<ProposalStageMutation> {
        return this.proposals.createProposal(session, userId, fields);
    }

    async editProposal(
        session: AdminSession, userId: string, proposalId: string, fields: ProposalFields
    ): Promise<ClientProposal> {
        return this.proposals.editProposal(session, userId, proposalId, fields);
    }

    async resendProposal(session: AdminSession, userId: string, proposalId: string): Promise<ProposalStageMutation> {
        return this.proposals.resendProposal(session, userId, proposalId);
    }

    async deleteProposal(session: AdminSession, userId: string, proposalId: string): Promise<void> {
        return this.proposals.deleteProposal(session, userId, proposalId);
    }

    async deleteProposalAttachment(
        session: AdminSession,
        userId: string,
        proposalId: string,
        attachmentIndex: number
    ): Promise<ClientProposal> {
        return this.proposals.deleteProposalAttachment(session, userId, proposalId, attachmentIndex);
    }

    async loadClients(session: AdminSession): Promise<AdminClientListItem[]> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients`, {
            headers: { Authorization: `Bearer ${session.token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            message?: string;
            clients?: AdminClientListItem[];
        };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível listar os clientes");
        return result.clients ?? [];
    }

    async loadClient(session: AdminSession, id: number | string): Promise<AdminClientDetails> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${session.token}` }
        });
        const result = await response.json().catch(() => ({})) as {
            message?: string;
            client?: AdminClientDetails;
        };
        if (!response.ok || !result.client) {
            throw new Error(result.message ?? "Não foi possível carregar o cliente");
        }
        return result.client;
    }

    async deleteClient(session: AdminSession, clientId: string, confirmationName: string): Promise<void> {
        const response = await fetch(`${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({ confirmationName })
        });
        if (response.ok) return;
        const result = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(result.message ?? "Não foi possível apagar o cliente");
    }

    async updateClientProjectStage(
        session: AdminSession,
        clientId: string,
        stageKey: ProjectStageKey,
        status: ProjectStageStatus
    ): Promise<UpdatedClientProjectStage> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}/project-stage`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`
                },
                body: JSON.stringify({ stageKey, status })
            }
        );
        const result = await response.json().catch(() => ({})) as Partial<UpdatedClientProjectStage> & {
            message?: string;
        };
        if (!response.ok || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(result.message ?? "Não foi possível atualizar a etapa do projeto");
        }
        return {
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async updateClientProjectStageOrder(
        session: AdminSession,
        clientId: string,
        stageKeys: ProjectStageKey[]
    ): Promise<UpdatedClientProjectStage> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(clientId)}/project-stages/order`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`
                },
                body: JSON.stringify({ stageKeys })
            }
        );
        const result = await response.json().catch(() => ({})) as Partial<UpdatedClientProjectStage> & {
            message?: string;
        };
        if (!response.ok || !result.currentStageKey || !Array.isArray(result.projectStages)) {
            throw new Error(result.message ?? "Não foi possível salvar a ordem das etapas");
        }
        return {
            currentStageKey: result.currentStageKey,
            projectStages: result.projectStages
        };
    }

    async loadBriefingReportStatus(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.requestBriefingReport(session, id, "GET");
    }

    async generateBriefingReport(session: AdminSession, id: string): Promise<BriefingReportStatus> {
        return this.requestBriefingReport(session, id, "POST");
    }

    private async requestBriefingReport(
        session: AdminSession,
        id: string,
        method: "GET" | "POST"
    ): Promise<BriefingReportStatus> {
        const response = await fetch(
            `${config.apiBaseUrl}/admin/clients/${encodeURIComponent(id)}/briefing-report`,
            { method, headers: { Authorization: `Bearer ${session.token}` } }
        );
        const result = await response.json().catch(() => ({})) as BriefingReportStatus & { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível processar o relatório");
        return result;
    }

    async loadViews(session: AdminSession): Promise<dbView[] | undefined> {
        const response = await fetch(`${config.apiBaseUrl}/view/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({})
        });
        if (!response.ok) return undefined;

        const result = await response.json() as { view: dbView[] };
        return result.view;
    }

    async createClient(session: AdminSession, client: NewClientPayload): Promise<unknown> {
        const response = await fetch(`${config.apiBaseUrl}/admin/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({ client })
        });
        const result = await response.json().catch(() => ({})) as { message?: string; client?: unknown };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível criar o cliente");
        return result.client;
    }
}
