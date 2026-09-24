import u from "umbrellajs";
import ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import { getHomeElements } from "../selectors/home.selector.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { ClientSystemApi } from "../infrastructure/client-system.api.js";
import { getStagesApprovalsElements } from "../selectors/stages-approvals.selector.js";
import { renderProjectStages } from "@/shared/project-stages.js";
import { ClientFinancialModule } from "./client-financial.module.js";
import { ClientProposalResponseModule } from "./client-proposal-response.module.js";
import { ClientShellModule } from "./system/client-shell.module.js";

export class ClientSystemModules {
    private readonly financial: ClientFinancialModule;
    private readonly shell: ClientShellModule;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly briefing: ClientBriefingController,
        private readonly api: ClientSystemApi,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) {
        this.financial = new ClientFinancialModule(view, models, api, token, navigate);
        this.shell = new ClientShellModule(view, models.base, token, navigate);
    }

    mount(route: ClientRoute, briefingStep?: number): void {
        if (route !== "financial") this.financial.dispose();
        document.body.classList.toggle("client-briefing-active", route === "briefing");
        switch (route) {
            case "base":
                this.shell.mount();
                break;
            case "home":
                this.mountHome();
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "stages-approvals":
                void this.mountStagesApprovals();
                break;
            case "financial":
                void this.financial.mount(this.shell.baseElements);
                break;
        }
    }

    private mountHome(): void {
        this.view.render(this.models.home, ".page-content");
        this.view.styleNavButton(this.shell.homeNavigation);
        const home = getHomeElements();
        u(home.stagesProcesses)
            .off("click")
            .on("click", () => this.navigate("stages-approvals"));
        u(home.financial)
            .off("click")
            .on("click", () => this.navigate("financial"));
    }

    private async mountStagesApprovals(): Promise<void> {
        const model = this.models["stages-approvals"];
        if (!model) {
            console.error('A view "stages-approvals" não foi encontrada para o cliente.');
            return;
        }

        this.view.render(model, ".page-content");
        this.view.styleNavButton(this.shell.stagesNavigation);
        const elements = getStagesApprovalsElements();
        const progressRoot = document.querySelector(".project-progress") ?? document;
        u(elements.homeIndex).off("click").on("click", () => this.navigate("home"));
        u(elements.back).off("click").on("click", () => this.navigate("home"));

        const proposalResponses = new ClientProposalResponseModule(elements, this.api, this.token, progressRoot);
        proposalResponses.mount();

        try {
            const project = await this.api.loadProposals(this.token);
            renderProjectStages(progressRoot, project.projectStages, project.currentStageKey);
            const proposals = project.proposals;
            elements.list.replaceChildren();
            if (proposals.length === 0) {
                elements.loading.hidden = true;
                elements.empty.hidden = false;
                return;
            }
            elements.empty.hidden = true;
            const items = document.createDocumentFragment();
            proposals.forEach(proposal => items.append(proposalResponses.render(proposal)));
            elements.list.append(items);
        } catch (error) {
            elements.loading.hidden = true;
            elements.feedback.textContent = error instanceof Error
                ? error.message
                : "Não foi possível carregar as aprovações.";
            return;
        }

        elements.loading.hidden = true;
    }

    private mountBriefing(step?: number): void {
        const template = this.briefing.getTemplate();
        if (!template.isConnected) {
            this.view.mountOwned(template, "body");
            this.briefing.initialize();
        }
        if (Number.isInteger(step)) this.briefing.navigateToStep(step!);
    }
}
