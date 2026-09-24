import type {
    ClientProposal,
    ClientProposalDecision,
    ClientProposalsGateway
} from "../infrastructure/proposals.api.js";
import type { StagesApprovalsElements } from "../selectors/stages-approvals.selector.js";
import { clientApprovalItem } from "../templates/client-approval-item.template.js";
import { renderProjectStages } from "@/shared/project-stages.js";

type ProposalResponseApi = Pick<ClientProposalsGateway, "approveProposal" | "beatProposal">;

export class ClientProposalResponseModule {
    private approvedProposalId = "";
    private rejectedProposalId = "";
    private listeners?: AbortController;
    private requestId = 0;

    constructor(
        private readonly elements: StagesApprovalsElements,
        private readonly api: ProposalResponseApi,
        private readonly token: string,
        private readonly progressRoot: ParentNode
    ) { }

    mount(): void {
        this.dispose();
        this.listeners = new AbortController();
        const options = { signal: this.listeners.signal };
        this.elements.approveCancel.addEventListener("click", () => this.elements.approveDialog.close(), options);
        this.elements.approveDialog.addEventListener("close", () => this.resetApproveDialog(), options);
        this.elements.approveConfirm.addEventListener("click", () => { void this.approve(); }, options);
        this.elements.rejectCancel.addEventListener("click", () => this.elements.rejectDialog.close(), options);
        this.elements.rejectDialog.addEventListener("close", () => this.resetRejectDialog(), options);
        this.elements.rejectConfirm.addEventListener("click", () => { void this.reject(); }, options);
    }

    dispose(): void {
        this.listeners?.abort();
        this.listeners = undefined;
        this.requestId += 1;
        this.approvedProposalId = "";
        this.rejectedProposalId = "";
    }

    render(proposal: ClientProposal): HTMLElement {
        const card = clientApprovalItem(proposal);
        const options = this.listeners ? { signal: this.listeners.signal } : undefined;
        card.querySelector<HTMLButtonElement>(".client-approval-approve")?.addEventListener("click", () => {
            this.approvedProposalId = proposal._id;
            this.elements.feedback.textContent = "";
            this.resetApproveDialog(false);
            this.elements.approveDialog.showModal();
            this.elements.approveComment.focus();
        }, options);
        card.querySelector<HTMLButtonElement>(".client-approval-reject")?.addEventListener("click", () => {
            this.rejectedProposalId = proposal._id;
            this.resetRejectDialog(false);
            this.elements.rejectDialog.showModal();
            this.elements.rejectComment.focus();
        }, options);
        return card;
    }

    private async approve(): Promise<void> {
        const comment = this.elements.approveComment.value.trim();
        if (!comment) return this.showValidation(
            this.elements.approveFeedback,
            this.elements.approveComment,
            "Digite um comentário antes de confirmar."
        );
        if (!this.approvedProposalId) return;
        await this.submit(
            this.elements.approveConfirm,
            this.elements.approveCancel,
            this.elements.approveFeedback,
            this.elements.approveDialog,
            () => this.api.approveProposal(
                this.token,
                this.approvedProposalId,
                comment,
                Array.from(this.elements.approveAttachments.files ?? [])
            ),
            "Não foi possível aprovar a proposta."
        );
    }

    private async reject(): Promise<void> {
        const comment = this.elements.rejectComment.value.trim();
        if (!comment) return this.showValidation(
            this.elements.rejectFeedback,
            this.elements.rejectComment,
            "Digite um comentário antes de confirmar."
        );
        if (!this.elements.rejectRevisionConfirmation.checked) return this.showValidation(
            this.elements.rejectFeedback,
            this.elements.rejectRevisionConfirmation,
            "Confirme o uso de 1 rodada de alterações."
        );
        if (!this.rejectedProposalId) return;
        await this.submit(
            this.elements.rejectConfirm,
            this.elements.rejectCancel,
            this.elements.rejectFeedback,
            this.elements.rejectDialog,
            () => this.api.beatProposal(
                this.token,
                this.rejectedProposalId,
                comment,
                true,
                Array.from(this.elements.rejectAttachments.files ?? [])
            ),
            "Não foi possível solicitar a alteração da proposta."
        );
    }

    private async submit(
        confirm: HTMLButtonElement,
        cancel: HTMLButtonElement,
        feedback: HTMLElement,
        dialog: HTMLDialogElement,
        request: () => Promise<ClientProposalDecision>,
        fallbackMessage: string
    ): Promise<void> {
        const requestId = this.requestId;
        confirm.disabled = true;
        cancel.disabled = true;
        feedback.textContent = "";
        try {
            const result = await request();
            if (!this.isActive(requestId)) return;
            const current = this.elements.list.querySelector<HTMLElement>(
                `[data-proposal-id="${CSS.escape(result.proposal._id)}"]`
            );
            current?.replaceWith(this.render(result.proposal));
            renderProjectStages(this.progressRoot, result.projectStages, result.currentStageKey);
            dialog.close();
        } catch (error) {
            if (!this.isActive(requestId)) return;
            feedback.textContent = error instanceof Error ? error.message : fallbackMessage;
        } finally {
            if (!this.isActive(requestId)) return;
            confirm.disabled = false;
            cancel.disabled = false;
        }
    }

    private isActive(requestId: number): boolean {
        return requestId === this.requestId
            && Boolean(this.listeners)
            && this.elements.list.isConnected;
    }

    private showValidation(feedback: HTMLElement, field: HTMLElement, message: string): void {
        feedback.textContent = message;
        field.focus();
    }

    private resetApproveDialog(clearId = true): void {
        if (clearId) this.approvedProposalId = "";
        this.elements.approveComment.value = "";
        this.elements.approveAttachments.value = "";
        this.elements.approveFeedback.textContent = "";
    }

    private resetRejectDialog(clearId = true): void {
        if (clearId) this.rejectedProposalId = "";
        this.elements.rejectComment.value = "";
        this.elements.rejectAttachments.value = "";
        this.elements.rejectRevisionConfirmation.checked = false;
        this.elements.rejectFeedback.textContent = "";
    }
}
