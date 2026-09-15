import { getProposalChangesElements } from "../selectors/proposal-changes.selector.js";

export class ProposalChangesConfirmation {
    private readonly elements;
    private readonly listeners = new AbortController();
    private proposalId?: string;
    private saving = false;
    private disposed = false;

    constructor(root: ParentNode, private readonly confirmChanges: (id: string) => Promise<void>) {
        this.elements = getProposalChangesElements(root);
        const { dialog, cancel, confirm } = this.elements;
        const options = { signal: this.listeners.signal };
        cancel.addEventListener("click", () => dialog.close(), options);
        confirm.addEventListener("click", () => void this.submit(), options);
        dialog.addEventListener("cancel", event => { if (this.saving) event.preventDefault(); }, options);
        dialog.addEventListener("close", () => { this.proposalId = undefined; }, options);
    }

    open(id: string, title: string): void {
        if (this.disposed || this.saving) return;
        this.proposalId = id;
        this.elements.name.textContent = title;
        this.elements.feedback.textContent = "";
        this.elements.dialog.showModal();
        this.elements.cancel.focus();
    }

    dispose(): void {
        this.disposed = true;
        this.listeners.abort();
        this.elements.dialog.close();
        this.proposalId = undefined;
    }

    private async submit(): Promise<void> {
        if (this.saving || !this.proposalId || this.disposed) return;
        this.saving = true;
        this.elements.confirm.disabled = true;
        this.elements.cancel.disabled = true;
        this.elements.feedback.textContent = "";
        try {
            await this.confirmChanges(this.proposalId);
            if (!this.disposed) this.elements.dialog.close();
        } catch (error) {
            if (!this.disposed) this.elements.feedback.textContent = error instanceof Error
                ? error.message : "Não foi possível confirmar as alterações.";
        } finally {
            this.saving = false;
            if (!this.disposed) {
                this.elements.confirm.disabled = false;
                this.elements.cancel.disabled = false;
            }
        }
    }
}
