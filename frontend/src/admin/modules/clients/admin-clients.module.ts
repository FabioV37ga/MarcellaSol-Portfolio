import u from "umbrellajs";
import type {
    AdminClientListItem,
    AdminSession
} from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import { getClientsElements, type clientsElements } from "@/admin/selectors/clients.selector.js";
import { clientListItem } from "@/admin/templates/client-list-item.template.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import { reconcileCollection } from "@/shared/visual-persistence/collection-reconciler.js";
import type { VisualCacheQuery } from "@/shared/visual-persistence/visual-cache.types.js";
import { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

type ClientsApi = Pick<AdminClientsGateway, "loadClients" | "deleteClient">;
type ClientsSnapshot = Awaited<ReturnType<ClientsApi["loadClients"]>>;

const CLIENTS_VISUAL_QUERY: VisualCacheQuery = { screen: "clients", schemaVersion: 1 };
const MAX_CACHED_CLIENTS = 50;

export class AdminClientsModule {
    private elements?: clientsElements;
    private requestId = 0;
    private nextCursor?: string;
    private loading = false;
    private loadedCount = 0;
    private paginationError = "";
    private clients: AdminClientListItem[] = [];
    private openDeleteDialog?: (client: AdminClientListItem) => void;

    constructor(
        private readonly view: AdminSystemView,
        private readonly template: HTMLElement,
        private readonly api: ClientsApi,
        private readonly session: AdminSession,
        private readonly navigateToNewClient: () => void,
        private readonly navigateToClient: (clientId: string) => void,
        private readonly clientsNavigation: () => HTMLElement | undefined,
        private readonly visualPersistence: VisualPersistenceController
    ) { }

    mount(): void {
        this.view.render(this.template, ".page-content");
        this.elements = getClientsElements();
        const requestId = ++this.requestId;
        this.nextCursor = undefined;
        this.loading = false;
        this.loadedCount = 0;
        this.paginationError = "";
        this.clients = [];
        this.view.registerDisposer(() => {
            if (this.requestId === requestId) this.dispose();
        });
        const navigation = this.clientsNavigation();
        if (navigation) this.view.styleNavButton(navigation);
        u(this.elements.new_client).off("click").on("click", this.navigateToNewClient);
        const openDeleteDialog = this.bindDeletion();
        this.openDeleteDialog = openDeleteDialog;
        this.elements.loadMore.onclick = () => {
            if (this.nextCursor) void this.loadPage(this.nextCursor, requestId, openDeleteDialog);
        };
        this.updatePagination();
        void this.loadFirstPage(requestId);
    }

    dispose(): void {
        this.requestId += 1;
        this.loading = false;
        this.visualPersistence.cancel(CLIENTS_VISUAL_QUERY);
    }

    private async loadFirstPage(requestId: number): Promise<void> {
        if (this.loading) return;
        this.loading = true;
        this.updatePagination();
        let hasPreview = false;
        await this.visualPersistence.revalidate<ClientsSnapshot>({
            query: CLIENTS_VISUAL_QUERY,
            presentPreview: snapshot => {
                hasPreview = true;
                this.applyFirstPage(snapshot);
            },
            load: () => this.api.loadClients(
                this.session,
                undefined,
                hasPreview ? MAX_CACHED_CLIENTS : undefined
            ),
            publish: snapshot => this.applyFirstPage(snapshot),
            reportError: error => {
                console.error("Erro ao carregar clientes:", error);
                if (this.elements && requestId === this.requestId) {
                    this.paginationError = "Não foi possível carregar os clientes.";
                }
            }
        });
        if (requestId !== this.requestId) return;
        this.loading = false;
        this.updatePagination();
    }

    private applyFirstPage(snapshot: ClientsSnapshot): void {
        if (!this.elements || !this.openDeleteDialog) return;
        this.reconcileClients(snapshot.clients, this.openDeleteDialog);
        this.nextCursor = snapshot.page.nextCursor;
        this.loadedCount = this.clients.length;
        this.paginationError = "";
        this.updatePagination();
    }

    private async loadPage(
        cursor: string | undefined,
        requestId: number,
        openDeleteDialog: (client: AdminClientListItem) => void
    ): Promise<void> {
        if (this.loading) return;
        this.loading = true;
        this.updatePagination();
        try {
            const result = await this.api.loadClients(this.session, cursor);
            if (!this.elements || requestId !== this.requestId) return;
            this.reconcileClients(this.appendUnique(result.clients), openDeleteDialog);
            this.nextCursor = result.page.nextCursor;
            this.loadedCount = this.clients.length;
            this.paginationError = "";
            this.rememberVisibleClients();
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

    private rememberVisibleClients(): void {
        const clients = this.clients.slice(0, MAX_CACHED_CLIENTS);
        this.visualPersistence.remember<ClientsSnapshot>(CLIENTS_VISUAL_QUERY, {
            clients,
            page: {
                limit: clients.length,
                hasMore: Boolean(this.nextCursor),
                ...(this.nextCursor ? { nextCursor: this.nextCursor } : {})
            }
        });
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
                this.reconcileClients(
                    this.clients.filter(item => item.id !== client.id),
                    this.openDeleteDialog!
                );
                this.visualPersistence.clear();
                this.loadedCount = this.clients.length;
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

    private reconcileClients(
        nextClients: AdminClientListItem[],
        openDeleteDialog: (client: AdminClientListItem) => void
    ): void {
        const elements = this.elements!;
        const delta = reconcileCollection(this.clients, nextClients, {
            keyOf: client => client.id,
            visuallyEqual: sameClientPresentation
        });
        delta.removed.forEach(({ key }) => this.clientNode(key)?.remove());
        delta.updated.forEach(({ key, item }) => {
            this.clientNode(key)?.replaceWith(this.createClientNode(item, openDeleteDialog));
        });
        delta.inserted.forEach(({ item }) => elements.list.append(this.createClientNode(item, openDeleteDialog)));
        nextClients.forEach((client, index) => {
            const nodes = this.clientNodes();
            const node = this.clientNode(client.id);
            if (node && nodes[index] !== node) elements.list.insertBefore(node, nodes[index] ?? null);
        });
        this.clients = [...nextClients];
    }

    private appendUnique(newClients: AdminClientListItem[]): AdminClientListItem[] {
        const known = new Set(this.clients.map(client => client.id));
        return [...this.clients, ...newClients.filter(client => !known.has(client.id))];
    }

    private createClientNode(
        client: AdminClientListItem,
        openDeleteDialog: (client: AdminClientListItem) => void
    ): HTMLElement {
        const item = clientListItem(client, this.elements!.itemTemplate);
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
        return item;
    }

    private clientNodes(): HTMLElement[] {
        return Array.from(this.elements!.list.querySelectorAll<HTMLElement>(":scope > .client-list-client"));
    }

    private clientNode(clientId: string): HTMLElement | undefined {
        return this.clientNodes().find(node => node.dataset.clientId === clientId);
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

function sameClientPresentation(previous: AdminClientListItem, next: AdminClientListItem): boolean {
    return previous.id === next.id
        && previous.name === next.name
        && previous.type === next.type
        && previous.hasFilledBriefing === next.hasFilledBriefing
        && previous.currentStageKey === next.currentStageKey
        && previous.currentStageStatus === next.currentStageStatus;
}
