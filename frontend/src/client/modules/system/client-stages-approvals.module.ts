import u from "umbrellajs";
import type { ClientRoute } from "../../navigation/client-system.router.js";
import type { ClientProposalsGateway } from "../../infrastructure/proposals.api.js";
import { getStagesApprovalsElements } from "../../selectors/stages-approvals.selector.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";
import { ClientProposalResponseModule } from "../client-proposal-response.module.js";
import { renderProjectStages } from "@/shared/project-stages.js";

export class ClientStagesApprovalsModule {
    private generation = 0;

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

        const proposalResponses = new ClientProposalResponseModule(elements, this.api, this.token, progressRoot);
        proposalResponses.mount();

        try {
            const project = await this.api.loadProposals(this.token);
            if (!this.isCurrent(generation, root)) return;
            renderProjectStages(progressRoot, project.projectStages, project.currentStageKey);
            elements.list.replaceChildren();
            if (project.proposals.length === 0) {
                elements.loading.hidden = true;
                elements.empty.hidden = false;
                return;
            }
            elements.empty.hidden = true;
            const items = document.createDocumentFragment();
            project.proposals.forEach(proposal => items.append(proposalResponses.render(proposal)));
            elements.list.append(items);
        } catch (error) {
            if (!this.isCurrent(generation, root)) return;
            elements.loading.hidden = true;
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar as aprovações.";
            return;
        }

        elements.loading.hidden = true;
    }

    dispose(): void {
        this.generation += 1;
    }

    private invalidate(generation: number): void {
        if (this.generation === generation) this.dispose();
    }

    private isCurrent(generation: number, root: HTMLElement): boolean {
        return this.generation === generation && root.isConnected;
    }
}
