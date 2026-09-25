import u from "umbrellajs";
import type { ClientRoute } from "../../navigation/client-system.router.js";
import type { ClientProjectResponse, ClientProposal, ClientProposalsGateway } from "../../infrastructure/proposals.api.js";
import { getStagesApprovalsElements } from "../../selectors/stages-approvals.selector.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";
import { ClientProposalResponseModule } from "../client-proposal-response.module.js";
import { renderProjectStages } from "@/shared/project-stages.js";
import { reconcileCollection } from "@/shared/visual-persistence/collection-reconciler.js";
import type { VisualCacheQuery } from "@/shared/visual-persistence/visual-cache.types.js";
import type { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

const MAX_CACHED_PROPOSALS = 50;
const STAGES_APPROVALS_QUERY: VisualCacheQuery = {
    screen: "client-stages-approvals",
    schemaVersion: 1
};

export class ClientStagesApprovalsModule {
    private generation = 0;
    private proposalResponses?: ClientProposalResponseModule;

    constructor(
        private readonly view: ClientSystemView,
        private readonly template: HTMLElement | undefined,
        private readonly api: ClientProposalsGateway,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void,
        private readonly visualPersistence: VisualPersistenceController
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
        let proposals: ClientProposal[] = [];
        let projectState: Pick<ClientProjectResponse, "projectStages" | "currentStageKey"> = {
            projectStages: [],
            currentStageKey: "briefing"
        };
        const remember = (): void => {
            const cached = proposals.slice(0, MAX_CACHED_PROPOSALS);
            this.visualPersistence.remember<ClientProjectResponse>(STAGES_APPROVALS_QUERY, {
                ...projectState,
                proposals: cached,
                page: {
                    limit: cached.length,
                    hasMore: Boolean(nextCursor),
                    ...(nextCursor ? { nextCursor } : {})
                }
            });
        };
        const proposalResponses = new ClientProposalResponseModule(
            elements,
            this.api,
            this.token,
            progressRoot,
            result => {
                proposals = proposals.map(proposal => proposal._id === result.proposal._id
                    ? result.proposal
                    : proposal);
                projectState = {
                    projectStages: result.projectStages,
                    currentStageKey: result.currentStageKey
                };
                remember();
            }
        );
        this.proposalResponses = proposalResponses;
        proposalResponses.mount();
        let nextCursor: string | undefined;
        let loading = false;
        let loadedCount = 0;

        const reconcileProposals = (next: ClientProposal[]): void => {
            const delta = reconcileCollection(proposals, next, {
                keyOf: proposal => proposal._id,
                visuallyEqual: (previous, current) => JSON.stringify(previous) === JSON.stringify(current)
            });
            delta.removed.forEach(({ key }) => proposalNode(elements.list, key)?.remove());
            delta.updated.forEach(({ key, item }) => {
                proposalNode(elements.list, key)?.replaceWith(proposalResponses.render(item));
            });
            delta.inserted.forEach(({ item }) => elements.list.append(proposalResponses.render(item)));
            next.forEach((proposal, index) => {
                const node = proposalNode(elements.list, proposal._id);
                const nodes = proposalNodes(elements.list);
                if (node && nodes[index] !== node) elements.list.insertBefore(node, nodes[index] ?? null);
            });
            proposals = [...next];
            loadedCount = proposals.length;
            elements.empty.hidden = loadedCount > 0;
        };

        const applyProject = (project: ClientProjectResponse): void => {
            projectState = {
                projectStages: project.projectStages,
                currentStageKey: project.currentStageKey
            };
            renderProjectStages(progressRoot, project.projectStages, project.currentStageKey);
            reconcileProposals(project.proposals);
            nextCursor = project.page.nextCursor;
            updatePagination();
        };

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
                projectState = {
                    projectStages: project.projectStages,
                    currentStageKey: project.currentStageKey
                };
                reconcileProposals(cursor ? appendUnique(proposals, project.proposals) : project.proposals);
                nextCursor = project.page.nextCursor;
                remember();
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
        loading = true;
        updatePagination();
        await this.visualPersistence.revalidate<ClientProjectResponse>({
            query: STAGES_APPROVALS_QUERY,
            presentPreview: snapshot => applyProject(snapshot),
            load: () => this.api.loadProposals(
                this.token,
                undefined,
                proposals.length > 0 ? MAX_CACHED_PROPOSALS : undefined
            ),
            publish: snapshot => {
                if (!this.isCurrent(generation, root)) return;
                applyProject(snapshot);
                elements.feedback.textContent = "";
            },
            reportError: error => {
                if (!this.isCurrent(generation, root)) return;
                elements.feedback.textContent = error instanceof Error
                    ? error.message
                    : "Não foi possível carregar as aprovações.";
            }
        });
        if (this.isCurrent(generation, root)) {
            loading = false;
            elements.loading.hidden = true;
            updatePagination();
        }
    }

    dispose(): void {
        this.generation += 1;
        this.visualPersistence.cancel(STAGES_APPROVALS_QUERY);
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

function proposalNodes(root: ParentNode): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>("[data-proposal-id]"));
}

function proposalNode(root: ParentNode, proposalId: string): HTMLElement | undefined {
    return proposalNodes(root).find(node => node.dataset.proposalId === proposalId);
}

function appendUnique(current: ClientProposal[], incoming: ClientProposal[]): ClientProposal[] {
    const known = new Set(current.map(proposal => proposal._id));
    return [...current, ...incoming.filter(proposal => !known.has(proposal._id))];
}
