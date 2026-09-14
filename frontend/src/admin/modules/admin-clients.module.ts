import u from "umbrellajs";
import type {
    AdminClientListItem,
    AdminSession,
    AdminSystemApi
} from "../infrastructure/admin-system.api.js";
import { getClientsElements, type clientsElements } from "../selectors/clients.selector.js";
import { clientListItem } from "../templates/client-list-item.template.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";

type ClientsApi = Pick<AdminSystemApi, "loadClients" | "deleteClient">;

export class AdminClientsModule {
    private elements?: clientsElements;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly api: ClientsApi,
        private readonly session: AdminSession,
        private readonly navigateToNewClient: () => void,
        private readonly navigateToClient: (clientId: string) => void,
        private readonly clientsNavigation: () => HTMLElement | undefined
    ) { }

    mount(): void {
        this.view.render(this.template, ".page-content");
        this.elements = getClientsElements();
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        u(this.elements.new_client).off("click").on("click", this.navigateToNewClient);
        void this.loadList();
    }

    private async loadList(): Promise<void> {
        try {
            const clients = await this.api.loadClients(this.session);
            if (!this.elements) return;
            const openDeleteDialog = this.bindDeletion();
            this.renderClients(clients, openDeleteDialog);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        }
    }

    private bindDeletion(): (client: AdminClientListItem) => void {
        const elements = this.elements!;
        let deletingClient: AdminClientListItem | undefined;
        let deleting = false;
        const syncConfirmation = (): void => {
            elements.deleteConfirm.disabled = !deletingClient
                || elements.deleteConfirmation.value !== deletingClient.name;
        };
        const resetDialog = (): void => {
            deletingClient = undefined;
            elements.deleteForm.reset();
            elements.deleteName.textContent = "";
            elements.deleteFeedback.textContent = "";
            elements.deleteConfirm.disabled = true;
        };

        elements.deleteConfirmation.oninput = syncConfirmation;
        elements.deleteCancel.onclick = () => elements.deleteDialog.close();
        elements.deleteDialog.oncancel = event => {
            if (deleting) event.preventDefault();
        };
        elements.deleteDialog.onclose = resetDialog;
        elements.deleteForm.onsubmit = event => {
            event.preventDefault();
            const client = deletingClient;
            if (!client || elements.deleteConfirmation.value !== client.name) {
                elements.deleteFeedback.textContent = "Digite o nome exatamente como apresentado.";
                syncConfirmation();
                return;
            }

            deleting = true;
            elements.deleteConfirm.disabled = true;
            elements.deleteCancel.disabled = true;
            elements.deleteConfirmation.disabled = true;
            elements.deleteFeedback.textContent = "Apagando cliente...";
            void this.api.deleteClient(this.session, client.id, elements.deleteConfirmation.value).then(() => {
                elements.list.querySelector<HTMLElement>(`[data-client-id="${CSS.escape(client.id)}"]`)?.remove();
                elements.deleteDialog.close();
            }, error => {
                elements.deleteFeedback.textContent = error instanceof Error
                    ? error.message : "Não foi possível apagar o cliente.";
            }).then(() => {
                deleting = false;
                elements.deleteCancel.disabled = false;
                elements.deleteConfirmation.disabled = false;
                syncConfirmation();
            });
        };

        return client => {
            deletingClient = client;
            elements.deleteName.textContent = client.name;
            elements.deleteConfirmation.value = "";
            elements.deleteFeedback.textContent = "";
            syncConfirmation();
            elements.deleteDialog.showModal();
            elements.deleteConfirmation.focus();
        };
    }

    private renderClients(
        clients: AdminClientListItem[],
        openDeleteDialog: (client: AdminClientListItem) => void
    ): void {
        const elements = this.elements!;
        elements.list.querySelectorAll(":scope > .client-list-client").forEach(item => item.remove());
        const items = document.createDocumentFragment();

        clients.forEach(client => {
            const item = clientListItem(client, elements.itemTemplate);
            u(item).on("click", () => this.navigateToClient(client.id));
            item.addEventListener("keydown", event => {
                if (event.target === item && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    this.navigateToClient(client.id);
                }
            });
            item.querySelector<HTMLButtonElement>(".client-delete")?.addEventListener("click", event => {
                event.stopPropagation();
                openDeleteDialog(client);
            });
            items.append(item);
        });
        elements.list.append(items);
    }
}
