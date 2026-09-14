import type {
    ClientProposal,
    ClientProposalDecision,
    ClientSystemApi
} from "../infrastructure/client-system.api.js";
import type { StagesApprovalsElements } from "../selectors/stages-approvals.selector.js";
import { clientApprovalItem } from "../templates/client-approval-item.template.js";
import { renderProjectStages } from "@/shared/project-stages.js";

type ProposalResponseApi = Pick<ClientSystemApi, "approveProposal" | "beatProposal">;

export class ClientProposalResponseModule {
    private approvedProposalId = "";
    private rejectedProposalId = "";

    constructor(
        private readonly elements: StagesApprovalsElements,
        private readonly api: ProposalResponseApi,
        private readonly token: string,
        private readonly progressRoot: ParentNode
    ) { }

    mount(): void {
        this.elements.approveCancel.addEventListener("click", () => this.elements.approveDialog.close());
        this.elements.approveDialog.addEventListener("close", () => this.resetApproveDialog());
        this.elements.approveConfirm.addEventListener("click", () => { void this.approve(); });
        this.elements.rejectCancel.addEventListener("click", () => this.elements.rejectDialog.close());
        this.elements.rejectDialog.addEventListener("close", () => this.resetRejectDialog());
        this.elements.rejectConfirm.addEventListener("click", () => { void this.reject(); });
    }

    render(proposal: ClientProposal): HTMLElement {
        const card = clientApprovalItem(proposal);
        card.querySelector<HTMLButtonElement>(".client-approval-approve")?.addEventListener("click", () => {
            this.approvedProposalId = proposal._id;
            this.elements.feedback.textContent = "";
            this.resetApproveDialog(false);
            this.elements.approveDialog.showModal();
            this.elements.approveComment.focus();
        });
        card.querySelector<HTMLButtonElement>(".client-approval-reject")?.addEventListener("click", () => {
            this.rejectedProposalId = proposal._id;
            this.resetRejectDialog(false);
            this.elements.rejectDialog.showModal();
            this.elements.rejectComment.focus();
        });
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
        confirm.disabled = true;
        cancel.disabled = true;
        feedback.textContent = "";
        try {
            const result = await request();
            const current = this.elements.list.querySelector<HTMLElement>(
                `[data-proposal-id="${CSS.escape(result.proposal._id)}"]`
            );
            current?.replaceWith(this.render(result.proposal));
            renderProjectStages(this.progressRoot, result.projectStages, result.currentStageKey);
            dialog.close();
        } catch (error) {
            feedback.textContent = error instanceof Error ? error.message : fallbackMessage;
        } finally {
            confirm.disabled = false;
            cancel.disabled = false;
        }
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
