import u from "umbrellajs";
import type {
    AdminClientListItem,
    AdminSession
} from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import { getClientsElements, type clientsElements } from "@/admin/selectors/clients.selector.js";
import { clientListItem } from "@/admin/templates/client-list-item.template.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";

type ClientsApi = Pick<AdminClientsGateway, "loadClients" | "deleteClient">;

export class AdminClientsModule {
    private elements?: clientsElements;
    private requestId = 0;
    private nextCursor?: string;
    private loading = false;
    private loadedCount = 0;
    private paginationError = "";

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
        const requestId = ++this.requestId;
        this.nextCursor = undefined;
        this.loading = false;
        this.loadedCount = 0;
        this.paginationError = "";
        this.view.registerDisposer(() => {
            if (this.requestId === requestId) this.dispose();
        });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        u(this.elements.new_client).off("click").on("click", this.navigateToNewClient);
        const openDeleteDialog = this.bindDeletion();
        this.elements.loadMore.onclick = () => {
            if (this.nextCursor) void this.loadPage(this.nextCursor, false, requestId, openDeleteDialog);
        };
        this.updatePagination();
        void this.loadPage(undefined, true, requestId, openDeleteDialog);
    }

    dispose(): void {
        this.requestId += 1;
        this.loading = false;
    }

    private async loadPage(
        cursor: string | undefined,
        replace: boolean,
        requestId: number,
        openDeleteDialog: (client: AdminClientListItem) => void
    ): Promise<void> {
        if (this.loading) return;
        this.loading = true;
        this.updatePagination();
        try {
            const result = await this.api.loadClients(this.session, cursor);
            if (!this.elements || requestId !== this.requestId) return;
            this.renderClients(result.clients, openDeleteDialog, replace);
            this.nextCursor = result.page.nextCursor;
            this.loadedCount = this.elements.list.querySelectorAll(":scope > .client-list-client").length;
            this.paginationError = "";
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            if (this.elements && requestId === this.requestId) {
                this.paginationError = "Não foi possível carregar os clientes.";
            }
        } finally {
            if (requestId === this.requestId) {
                this.loading = false;
                this.updatePagination();
            }
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
                this.loadedCount = elements.list.querySelectorAll(":scope > .client-list-client").length;
                this.updatePagination();
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
        openDeleteDialog: (client: AdminClientListItem) => void,
        replace: boolean
    ): void {
        const elements = this.elements!;
        if (replace) elements.list.querySelectorAll(":scope > .client-list-client").forEach(item => item.remove());
        const items = document.createDocumentFragment();
        const existing = new Set(
            Array.from(elements.list.querySelectorAll<HTMLElement>(":scope > .client-list-client"))
                .map(item => item.dataset.clientId)
                .filter((id): id is string => Boolean(id))
        );

        clients.forEach(client => {
            if (existing.has(client.id)) return;
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

    private updatePagination(): void {
        if (!this.elements) return;
        this.elements.loadMore.hidden = !this.nextCursor;
        this.elements.loadMore.disabled = this.loading;
        this.elements.loadMore.textContent = this.loading && this.nextCursor ? "Carregando..." : "Carregar mais";
        if (this.paginationError) {
            this.elements.paginationStatus.textContent = this.paginationError;
            return;
        }
        if (!this.loading || this.loadedCount > 0) {
            this.elements.paginationStatus.textContent = `${this.loadedCount} ${this.loadedCount === 1 ? "cliente exibido" : "clientes exibidos"}`;
        }
    }
}
