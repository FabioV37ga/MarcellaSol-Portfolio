import u from "umbrellajs";
import type { ClientRoute } from "../../navigation/client-system.router.js";
import type { ClientProposalsGateway } from "../../infrastructure/proposals.api.js";
import { getStagesApprovalsElements } from "../../selectors/stages-approvals.selector.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";
import { ClientProposalResponseModule } from "../client-proposal-response.module.js";
import { renderProjectStages } from "@/shared/project-stages.js";

export class ClientStagesApprovalsModule {
    private generation = 0;
    private proposalResponses?: ClientProposalResponseModule;

    constructor(
        private readonly view: ClientSystemView,
        private readonly template: HTMLElement | undefined,
        private readonly api: ClientProposalsGateway,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) { }

    async mount(navigationButton?: HTMLElement): Promise<void> {
        if (!this.template) {
            console.error('A view "stages-approvals" não foi encontrada para o cliente.');
            return;
        }

        const root = this.view.render(this.template, ".page-content");
        const generation = ++this.generation;
        this.view.registerDisposer(() => this.invalidate(generation));
        this.view.styleNavButton(navigationButton);
        const elements = getStagesApprovalsElements();
        const progressRoot = root.querySelector<HTMLElement>(".project-progress") ?? root;
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        this.proposalResponses?.dispose();
        const proposalResponses = new ClientProposalResponseModule(elements, this.api, this.token, progressRoot);
        this.proposalResponses = proposalResponses;
        proposalResponses.mount();
        let nextCursor: string | undefined;
        let loading = false;
        let loadedCount = 0;

        const updatePagination = (): void => {
            elements.loadMore.hidden = !nextCursor;
            elements.loadMore.disabled = loading;
            elements.loadMore.textContent = loading && nextCursor ? "Carregando..." : "Carregar mais";
            elements.paginationStatus.textContent = loadedCount > 0
                ? `${loadedCount} ${loadedCount === 1 ? "proposta exibida" : "propostas exibidas"}`
                : "";
        };

        const loadPage = async (cursor?: string): Promise<void> => {
            if (loading) return;
            loading = true;
            elements.feedback.textContent = "";
            updatePagination();
            try {
                const project = await this.api.loadProposals(this.token, cursor);
                if (!this.isCurrent(generation, root)) return;
                renderProjectStages(progressRoot, project.projectStages, project.currentStageKey);
                if (!cursor) elements.list.replaceChildren();
                const existing = new Set(Array.from(
                    elements.list.querySelectorAll<HTMLElement>("[data-proposal-id]")
                ).map(item => item.dataset.proposalId));
                const items = document.createDocumentFragment();
                project.proposals.forEach(proposal => {
                    if (!existing.has(proposal._id)) items.append(proposalResponses.render(proposal));
                });
                elements.list.append(items);
                loadedCount = elements.list.querySelectorAll("[data-proposal-id]").length;
                nextCursor = project.page.nextCursor;
                elements.empty.hidden = loadedCount > 0;
            } catch (error) {
                if (!this.isCurrent(generation, root)) return;
                elements.feedback.textContent = error instanceof Error
                    ? error.message
                    : "Não foi possível carregar as aprovações.";
            } finally {
                if (this.isCurrent(generation, root)) {
                    loading = false;
                    elements.loading.hidden = true;
                    updatePagination();
                }
            }
        };

        elements.loadMore.onclick = () => {
            if (nextCursor) void loadPage(nextCursor);
        };

        updatePagination();
        await loadPage();
    }

    dispose(): void {
        this.generation += 1;
        this.proposalResponses?.dispose();
        this.proposalResponses = undefined;
    }

    private invalidate(generation: number): void {
        if (this.generation === generation) this.dispose();
    }

    private isCurrent(generation: number, root: HTMLElement): boolean {
        return this.generation === generation && root.isConnected;
    }
}
