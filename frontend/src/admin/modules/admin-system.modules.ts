import u from "umbrellajs";
import { getBaseElements, type baseElements } from "../selectors/base.selector.js";
import { getClientsElements, type clientsElements } from "../selectors/clients.selector.js";
import { getHomeElements, type homeElements } from "../selectors/home.selector.ts.js";
import { getNewClientElements, type newClientElements } from "../selectors/new-client.selector.js";
import type { system } from "../templates/interface.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import type { ClientCreationFlow } from "./client-creation.flow.js";
import type { AdminSession, AdminSystemApi, ClientProposal } from "../infrastructure/admin-system.api.js";
import { clientListItem } from "../templates/client-list-item.template.js";
import { getClientManagementElements } from "../selectors/client-management.selector.js";
import { clientProposalItem } from "../templates/client-proposal-item.template.js";
import { logoutSession } from "@/shared/session/logout.js";
import { renderProjectStages, type ProjectStageKey } from "@/shared/project-stages.js";

export class AdminSystemModules {
    private base?: baseElements;
    private home?: homeElements;
    private clients?: clientsElements;
    private newClient?: newClientElements;
    private clientManagementRequestId = 0;

    constructor(
        private readonly view: AdminSystemView,
        private readonly models: system,
        private readonly clientCreation: ClientCreationFlow,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute, id?: string) => void
    ) {}

    mount(route: AdminRoute, id?: string): void {
        switch (route) {
            case "base": this.mountBase(); break;
            case "home": this.mountHome(); break;
            case "clients": this.mountClients(); break;
            case "client-management": void this.mountClientManagement(id); break;
            case "client-proposals": void this.mountClientProposals(id); break;
            case "new-client": this.mountNewClient(); break;
            case "briefing-home":
            case "briefing-investment":
            case "briefing-rooms":
            case "briefing-finish":
                this.clientCreation.mount(route);
                break;
        }
    }

    private mountBase(): void {
        this.view.render(this.models.base!, "body");
        this.base = getBaseElements();
        u(this.base.desktop_nav_home).off("click").on("click", () => this.navigate("home"));
        u(this.base.desktop_nav_client).off("click").on("click", () => this.navigate("clients"));
        u(this.base.desktop_logout).off("click").on("click", () => {
            void logoutSession("admin", this.session.token);
        });
    }

    private mountHome(): void {
        this.view.render(this.models.home!, ".page-content");
        this.home = getHomeElements();
        this.view.styleNavButton(this.base!.desktop_nav_home);
        u(this.home.access_client).off("click").on("click", () => this.navigate("clients"));
    }

    private mountClients(): void {
        this.view.render(this.models.client!, ".page-content");
        this.clients = getClientsElements();
        this.view.styleNavButton(this.base!.desktop_nav_client);
        u(this.clients.new_client).off("click").on("click", () => this.navigate("new-client"));
        void this.mountClientList();
    }

    private async mountClientList(): Promise<void> {
        try {
            const clients = await this.api.loadClients(this.session);
            if (!this.clients) return;

            this.clients.list
                .querySelectorAll(":scope > .client-list-client")
                .forEach(item => item.remove());

            const items = document.createDocumentFragment();
            clients.forEach(client => {
                const item = clientListItem(client);
                u(item).on("click", () => this.navigate("client-management", client.id));
                items.append(item);
            });
            this.clients.list.append(items);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        }
    }

    private async mountClientManagement(id?: string): Promise<void> {
        if (!id || !this.models.clientManagement) {
            this.navigate("clients");
            return;
        }

        this.view.render(this.models.clientManagement, ".page-content");
        const requestId = ++this.clientManagementRequestId;
        this.view.styleNavButton(this.base!.desktop_nav_client);
        const elements = getClientManagementElements();
        elements.drive.removeAttribute("href");
        elements.drive.setAttribute("aria-disabled", "true");
        elements.drive.classList.add("client-management-action-disabled");
        elements.briefingReport.disabled = true;
        elements.briefingReport.classList.add("client-management-report-loading");
        elements.briefingReport.classList.remove("client-management-report-unavailable");
        elements.briefingReportLabel.textContent = "Verificando...";
        u(elements.briefingReport).off("click");
        elements.briefingReport.onclick = null;
        u(elements.clientsIndex).off("click").on("click", () => this.navigate("clients"));
        u(elements.back).off("click").on("click", () => this.navigate("clients"));

        try {
            const client = await this.api.loadClient(this.session, id);
            if (requestId !== this.clientManagementRequestId) return;
            elements.clientName.textContent = client.name;
            elements.titleName.textContent = client.name;
            if (elements.proposals) {
                u(elements.proposals).off("click").on("click", () => this.navigate("client-proposals", id));
            }

            if (client.driveFolderUrl) {
                elements.drive.href = client.driveFolderUrl;
                elements.drive.target = "_blank";
                elements.drive.rel = "noopener noreferrer";
                elements.drive.removeAttribute("aria-disabled");
                elements.drive.classList.remove("client-management-action-disabled");
            } else {
                elements.drive.removeAttribute("href");
                elements.drive.setAttribute("aria-disabled", "true");
                elements.drive.classList.add("client-management-action-disabled");
            }

            if (client.hasFilledBriefing) {
                await this.mountBriefingReport(id, elements, requestId);
            } else {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.remove("client-management-report-loading");
                elements.briefingReport.classList.add("client-management-report-unavailable");
                elements.briefingReportLabel.textContent = "Cliente ainda não preencheu o briefing";
            }
        } catch (error) {
            if (requestId !== this.clientManagementRequestId) return;
            console.error("Erro ao carregar o cliente:", error);
            this.navigate("clients");
        }
    }

    private async mountClientProposals(clientId?: string): Promise<void> {
        if (!clientId) {
            this.navigate("clients");
            return;
        }

        let proposalsView = this.models.clientProposals;
        if (!proposalsView) {
            const databaseViews = await this.api.loadViews(this.session);
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

        this.view.render(proposalsView, ".page-content");
        this.view.styleNavButton(this.base!.desktop_nav_client);

        const root = document.querySelector<HTMLElement>(".proposals-management-container");
        if (!root) return;
        const openList = root.querySelector<HTMLElement>("#open-proposals-list")!;
        const closedList = root.querySelector<HTMLElement>("#closed-proposals-list")!;
        const dialog = root.querySelector<HTMLDialogElement>("#proposal-dialog")!;
        const deleteDialog = root.querySelector<HTMLDialogElement>("#proposal-delete-dialog")!;
        const form = root.querySelector<HTMLFormElement>("#proposal-form")!;
        const feedback = root.querySelector<HTMLElement>("#proposals-feedback")!;
        const attachmentInput = root.querySelector<HTMLInputElement>("#proposal-attachment")!;
        const stageSelect = root.querySelector<HTMLSelectElement>("#proposal-stage")!;
        // Mantém compatibilidade com uma versão antiga da view já persistida no MongoDB.
        attachmentInput.multiple = true;
        attachmentInput.name = "attachments";
        let proposals: ClientProposal[] = [];
        let editingId: string | undefined;
        let deletingProposal: ClientProposal | undefined;
        let savingProposal = false;
        let currentStageKey: ProjectStageKey = "briefing";

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
            this.toggleProposalEmpty(closedList, "Nenhuma proposta rebatida ou cancelada.");
        };

        const openDeleteDialog = (proposal: ClientProposal): void => {
            deletingProposal = proposal;
            root.querySelector<HTMLElement>("#proposal-delete-name")!.textContent = proposal.title;
            deleteDialog.showModal();
        };

        const openEditor = (proposal?: ClientProposal): void => {
            editingId = proposal?._id;
            form.reset();
            root.querySelector<HTMLElement>("#proposal-dialog-title")!.textContent = proposal ? "Editar proposta" : "Nova proposta";
            root.querySelector<HTMLInputElement>("#proposal-title")!.value = proposal?.title ?? "";
            root.querySelector<HTMLTextAreaElement>("#proposal-description")!.value = proposal?.description ?? "";
            stageSelect.value = proposal?.stageKey ?? currentStageKey;
            attachmentInput.required = !proposal;
            root.querySelector<HTMLElement>("#proposal-current-attachment")!.textContent = proposal
                ? "Novos arquivos serão acrescentados aos anexos atuais." : "Selecione ao menos um anexo.";
            dialog.showModal();
        };

        const resendProposal = async (proposal: ClientProposal, button: HTMLButtonElement): Promise<void> => {
            button.disabled = true;
            try {
                const updated = await this.api.resendProposal(this.session, clientId, proposal._id);
                proposals = proposals.map(item => item._id === updated._id ? updated : item);
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
                : this.api.createProposal(this.session, clientId, { title, description, stageKey, attachments });
            void request.then(saved => {
                const existing = proposals.findIndex(item => item._id === saved._id);
                if (existing >= 0) proposals[existing] = saved;
                else proposals.unshift(saved);
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
            root.querySelector<HTMLElement>("#proposals-client-name")!.textContent = client.name;
            root.querySelector<HTMLElement>("#proposals-title-name")!.textContent = client.name;
            currentStageKey = client.currentStageKey;
            renderProjectStages(root, client.projectStages, client.currentStageKey);
            proposals = loaded;
            feedback.textContent = "";
            render();
        } catch (error) {
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

    private async mountBriefingReport(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>,
        requestId: number
    ): Promise<void> {
        try {
            const status = await this.api.loadBriefingReportStatus(this.session, clientId);
            if (requestId !== this.clientManagementRequestId) return;
            this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
        } catch (error) {
            if (requestId !== this.clientManagementRequestId) return;
            console.error("Erro ao verificar relatório do briefing:", error);
            elements.briefingReport.classList.remove("client-management-report-loading");
            elements.briefingReport.disabled = false;
            elements.briefingReportLabel.textContent = "Tentar novamente";
            elements.briefingReport.onclick = () => {
                elements.briefingReport.disabled = true;
                elements.briefingReport.classList.add("client-management-report-loading");
                elements.briefingReportLabel.textContent = "Verificando...";
                void this.mountBriefingReport(clientId, elements, requestId);
            };
        }
    }

    private bindBriefingReportAction(
        clientId: string,
        elements: ReturnType<typeof getClientManagementElements>,
        exists: boolean,
        folderUrl: string | undefined,
        requestId: number
    ): void {
        const button = elements.briefingReport;
        button.disabled = false;
        button.classList.remove("client-management-report-loading");
        button.classList.remove("client-management-report-unavailable");
        u(button).off("click");
        button.onclick = null;

        if (exists && folderUrl) {
            elements.briefingReportLabel.textContent = "Acessar";
            button.onclick = () => {
                window.open(folderUrl, "_blank", "noopener,noreferrer");
            };
            return;
        }

        elements.briefingReportLabel.textContent = "Gerar relatório";
        button.onclick = () => {
            button.disabled = true;
            button.classList.add("client-management-report-loading");
            elements.briefingReportLabel.textContent = "Gerando relatório...";
            void this.api.generateBriefingReport(this.session, clientId)
                .then(status => {
                    if (requestId !== this.clientManagementRequestId) return;
                    this.bindBriefingReportAction(clientId, elements, status.exists, status.folderUrl, requestId);
                })
                .catch(error => {
                    if (requestId !== this.clientManagementRequestId) return;
                    console.error("Erro ao gerar relatório do briefing:", error);
                    button.disabled = false;
                    button.classList.remove("client-management-report-loading");
                    elements.briefingReportLabel.textContent = "Tentar novamente";
                });
        };
    }

    private mountNewClient(): void {
        this.view.render(this.models.newClient!, ".page-content");
        this.newClient = getNewClientElements();
        u(this.newClient.cancel).off("click").on("click", () => this.navigate("clients"));
        u(this.newClient.root).off("click").on("click", () => this.navigate("clients"));
        u(this.newClient.confirm).off("click").on("click", () => {
            void this.clientCreation.start(
                this.newClient!.nameField.value,
                this.newClient!.loginField.value,
                this.newClient!.passwordField.value
            );
        });
    }
}
