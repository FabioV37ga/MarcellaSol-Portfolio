import u from "umbrellajs";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import type { AdminSession, AdminSystemApi, ClientProposal } from "../infrastructure/admin-system.api.js";
import type { system } from "../templates/interface.js";
import { clientProposalItem } from "../templates/client-proposal-item.template.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import { projectStageLabels, type ProjectStage, type ProjectStageKey } from "@/shared/project-stages.js";
import { ProjectStageEditor } from "../ui/project-stage-editor.js";

export class AdminClientProposalsModule {
    private requestId = 0;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void,
        private readonly getNavButton: () => HTMLElement | undefined
    ) {}

    async mount(clientId?: string): Promise<void> {
        if (!clientId) {
            this.navigate("clients");
            return;
        }
        const requestId = ++this.requestId;

        let proposalsView = this.models.clientProposals;
        if (!proposalsView) {
            const databaseViews = await this.api.loadViews(this.session);
            if (requestId !== this.requestId) return;
            const databaseView = databaseViews?.find(
                item => item.viewName?.trim().toLowerCase() === "client-proposals"
            );
            if (databaseView) {
                proposalsView = u(databaseView.view).first() as HTMLElement;
                this.models.clientProposals = proposalsView;
            }
        }

        if (!proposalsView) {
            console.error('A view admin "client-proposals" não foi encontrada na resposta de /view/admin.');
            window.alert('A view "client-proposals" não está cadastrada no MongoDB para a permissão admin.');
            return;
        }

        const mountedProposalsView = this.view.render(proposalsView, ".page-content");
        this.view.registerDisposer(() => {
            this.requestId += 1;
        });
        const navButton = this.getNavButton();
        if (navButton) this.view.styleNavButton(navButton);

        const root = mountedProposalsView.matches(".proposals-management-container")
            ? mountedProposalsView
            : mountedProposalsView.querySelector<HTMLElement>(".proposals-management-container");
        if (!root) return;
        const openList = root.querySelector<HTMLElement>("#open-proposals-list")!;
        const closedList = root.querySelector<HTMLElement>("#closed-proposals-list")!;
        const dialog = root.querySelector<HTMLDialogElement>("#proposal-dialog")!;
        const deleteDialog = root.querySelector<HTMLDialogElement>("#proposal-delete-dialog")!;
        const form = root.querySelector<HTMLFormElement>("#proposal-form")!;
        const feedback = root.querySelector<HTMLElement>("#proposals-feedback")!;
        const attachmentInput = root.querySelector<HTMLInputElement>("#proposal-attachment")!;
        const attachmentHelp = root.querySelector<HTMLElement>("#proposal-current-attachment")!;
        const existingAttachments = root.querySelector<HTMLElement>("#proposal-existing-attachments");
        const existingAttachmentsList = root.querySelector<HTMLElement>("#proposal-existing-attachments-list");
        const attachmentItemTemplate = root.querySelector<HTMLTemplateElement>("#proposal-attachment-item-template");
        const stageSelect = root.querySelector<HTMLSelectElement>("#proposal-stage")!;
        // Mantém compatibilidade com uma versão antiga da view já persistida no MongoDB.
        attachmentInput.multiple = true;
        attachmentInput.name = "attachments";
        let proposals: ClientProposal[] = [];
        let editingId: string | undefined;
        let editingProposal: ClientProposal | undefined;
        let deletingProposal: ClientProposal | undefined;
        let savingProposal = false;
        let removingAttachment = false;
        let currentStageKey: ProjectStageKey = "briefing";
        let projectStageEditor: ProjectStageEditor | undefined;

        const syncProposalStageOptions = (stages: ProjectStage[]): void => {
            const selected = stageSelect.value as ProjectStageKey;
            stageSelect.replaceChildren(...stages
                .filter(stage => stage.key !== "contract")
                .map(stage => {
                    const option = document.createElement("option");
                    option.value = stage.key;
                    option.textContent = projectStageLabels[stage.key];
                    return option;
                })
            );
            stageSelect.value = stages.some(stage => stage.key === selected) ? selected : currentStageKey;
        };

        const proposalAttachments = (proposal: ClientProposal): string[] => proposal.attachments?.length
            ? proposal.attachments : proposal.attachment ? [proposal.attachment] : [];

        const renderEditorAttachments = (): void => {
            if (!existingAttachments || !existingAttachmentsList || !attachmentItemTemplate) return;
            existingAttachmentsList.replaceChildren();
            const attachments = editingProposal ? proposalAttachments(editingProposal) : [];
            existingAttachments.hidden = attachments.length === 0;
            attachments.forEach((url, index) => {
                const item = attachmentItemTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
                if (!item) return;
                const link = item.querySelector<HTMLAnchorElement>(".proposal-existing-attachment-link")!;
                const label = item.querySelector<HTMLElement>(".proposal-existing-attachment-label")!;
                const remove = item.querySelector<HTMLButtonElement>(".proposal-attachment-remove")!;
                link.href = url;
                label.textContent = `Anexo ${index + 1}`;
                remove.setAttribute("aria-label", `Remover anexo ${index + 1}`);
                remove.disabled = attachments.length === 1 || removingAttachment;
                remove.title = attachments.length === 1
                    ? "A proposta deve manter ao menos um anexo" : "Remover anexo";
                remove.addEventListener("click", () => void removeProposalAttachment(index));
                existingAttachmentsList.append(item);
            });
        };

        const removeProposalAttachment = async (attachmentIndex: number): Promise<void> => {
            if (!editingProposal || removingAttachment) return;
            removingAttachment = true;
            attachmentHelp.textContent = "Removendo anexo...";
            renderEditorAttachments();
            try {
                const updated = await this.api.deleteProposalAttachment(
                    this.session,
                    clientId,
                    editingProposal._id,
                    attachmentIndex
                );
                proposals = proposals.map(item => item._id === updated._id ? updated : item);
                editingProposal = updated;
                editingId = updated._id;
                feedback.textContent = "Anexo removido com sucesso.";
                attachmentHelp.textContent = "Anexo removido. A alteração já foi salva.";
                render();
            } catch (error) {
                attachmentHelp.textContent = error instanceof Error ? error.message : "Não foi possível remover o anexo.";
            } finally {
                removingAttachment = false;
                renderEditorAttachments();
            }
        };

        const render = (): void => {
            openList.replaceChildren();
            closedList.replaceChildren();
            proposals.forEach(proposal => {
                const item = clientProposalItem(proposal);
                const target = proposal.status === "sent" || proposal.status === "resent" ? openList : closedList;
                target.append(item);
                u(item.querySelector(".proposal-edit") as HTMLElement).on("click", () => openEditor(proposal));
                u(item.querySelector(".proposal-delete") as HTMLElement).on("click", () => openDeleteDialog(proposal));
                const resend = item.querySelector<HTMLButtonElement>(".proposal-resend");
                if (resend) u(resend).on("click", () => void resendProposal(proposal, resend));
            });
            this.toggleProposalEmpty(openList, "Nenhuma proposta aberta.");
            this.toggleProposalEmpty(closedList, "Nenhuma proposta com alterações solicitadas ou cancelada.");
        };

        const openDeleteDialog = (proposal: ClientProposal): void => {
            deletingProposal = proposal;
            root.querySelector<HTMLElement>("#proposal-delete-name")!.textContent = proposal.title;
            deleteDialog.showModal();
        };

        const openEditor = (proposal?: ClientProposal): void => {
            editingId = proposal?._id;
            editingProposal = proposal;
            form.reset();
            root.querySelector<HTMLElement>("#proposal-dialog-title")!.textContent = proposal ? "Editar proposta" : "Nova proposta";
            root.querySelector<HTMLInputElement>("#proposal-title")!.value = proposal?.title ?? "";
            root.querySelector<HTMLTextAreaElement>("#proposal-description")!.value = proposal?.description ?? "";
            stageSelect.value = proposal?.stageKey ?? currentStageKey;
            attachmentInput.required = !proposal;
            attachmentHelp.textContent = proposal
                ? "A remoção é salva imediatamente. Novos arquivos serão acrescentados ao salvar."
                : "Selecione ao menos um anexo.";
            renderEditorAttachments();
            dialog.showModal();
        };

        const resendProposal = async (proposal: ClientProposal, button: HTMLButtonElement): Promise<void> => {
            button.disabled = true;
            try {
                const result = await this.api.resendProposal(this.session, clientId, proposal._id);
                proposals = proposals.map(item => item._id === result.proposal._id ? result.proposal : item);
                projectStageEditor?.replaceState(result);
                feedback.textContent = "Proposta reenviada com sucesso.";
                render();
            } catch (error) {
                feedback.textContent = error instanceof Error ? error.message : "Não foi possível reenviar a proposta.";
                button.disabled = false;
            }
        };

        u(root.querySelector("#proposals-clients-index") as HTMLElement).off("click").on("click", () => this.navigate("clients"));
        u(root.querySelector("#proposals-client-index") as HTMLElement).off("click").on("click", () => this.navigate("client-management", clientId));
        u(root.querySelector("#proposals-back") as HTMLElement).off("click").on("click", () => this.navigate("client-management", clientId));
        u(root.querySelector("#new-proposal") as HTMLElement).off("click").on("click", () => openEditor());
        u(root.querySelector("#proposal-cancel") as HTMLElement).off("click").on("click", () => dialog.close());
        u(root.querySelector("#proposal-delete-cancel") as HTMLElement).off("click").on("click", () => {
            deletingProposal = undefined;
            deleteDialog.close();
        });
        u(root.querySelector("#proposal-delete-confirm") as HTMLElement).off("click").on("click", () => {
            if (!deletingProposal) return;
            const proposal = deletingProposal;
            const button = root.querySelector<HTMLButtonElement>("#proposal-delete-confirm")!;
            button.disabled = true;
            feedback.textContent = "Removendo proposta e anexos...";
            void this.api.deleteProposal(this.session, clientId, proposal._id).then(() => {
                proposals = proposals.filter(item => item._id !== proposal._id);
                deletingProposal = undefined;
                deleteDialog.close();
                feedback.textContent = "Proposta e anexos removidos com sucesso.";
                render();
            }, error => {
                feedback.textContent = error instanceof Error ? error.message : "Não foi possível remover a proposta.";
            }).then(() => { button.disabled = false; });
        });
        u(form).off("submit").on("submit", (event: Event) => {
            event.preventDefault();
            if (savingProposal) return;
            savingProposal = true;
            const submit = root.querySelector<HTMLButtonElement>("#proposal-save")!;
            submit.disabled = true;
            feedback.textContent = "Salvando proposta...";
            const title = root.querySelector<HTMLInputElement>("#proposal-title")!.value;
            const description = root.querySelector<HTMLTextAreaElement>("#proposal-description")!.value;
            const stageKey = stageSelect.value as ProjectStageKey;
            const attachments = Array.from(attachmentInput.files ?? []);
            const request = editingId
                ? this.api.editProposal(this.session, clientId, editingId, { title, description, stageKey, attachments })
                    .then(proposal => ({ proposal }))
                : this.api.createProposal(this.session, clientId, { title, description, stageKey, attachments });
            void request.then(result => {
                const saved = result.proposal;
                const existing = proposals.findIndex(item => item._id === saved._id);
                if (existing >= 0) proposals[existing] = saved;
                else proposals.unshift(saved);
                if (
                    "projectStages" in result
                    && Array.isArray(result.projectStages)
                    && "currentStageKey" in result
                ) {
                    projectStageEditor?.replaceState({
                        projectStages: result.projectStages,
                        currentStageKey: result.currentStageKey as ProjectStageKey
                    });
                }
                dialog.close();
                feedback.textContent = "Proposta salva com sucesso.";
                render();
            }, error => {
                feedback.textContent = error instanceof Error ? error.message : "Não foi possível salvar a proposta.";
            }).then(() => {
                savingProposal = false;
                submit.disabled = false;
            });
        });

        try {
            const [client, loaded] = await Promise.all([
                this.api.loadClient(this.session, clientId),
                this.api.loadProposals(this.session, clientId)
            ]);
            if (requestId !== this.requestId) return;
            root.querySelector<HTMLElement>("#proposals-client-name")!.textContent = client.name;
            root.querySelector<HTMLElement>("#proposals-title-name")!.textContent = client.name;
            currentStageKey = client.currentStageKey;
            syncProposalStageOptions(client.projectStages);
            projectStageEditor = new ProjectStageEditor(
                root,
                client.projectStages,
                client.currentStageKey,
                client.hasProjectStageOrder,
                (stageKey, status) => this.api.updateClientProjectStage(
                    this.session,
                    clientId,
                    stageKey,
                    status
                ),
                stageKeys => this.api.updateClientProjectStageOrder(
                    this.session,
                    clientId,
                    stageKeys
                ),
                result => {
                    currentStageKey = result.currentStageKey;
                    syncProposalStageOptions(result.projectStages);
                }
            );
            proposals = loaded;
            feedback.textContent = "";
            render();
        } catch (error) {
            if (requestId !== this.requestId) return;
            feedback.textContent = error instanceof Error ? error.message : "Não foi possível carregar as propostas.";
        }
    }


    private toggleProposalEmpty(list: HTMLElement, message: string): void {
        if (list.childElementCount > 0) return;
        const empty = document.createElement("p");
        empty.className = "proposals-empty";
        empty.textContent = message;
        list.append(empty);
    }

}
