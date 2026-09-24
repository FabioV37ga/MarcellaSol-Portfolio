import ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { ClientSystemApi } from "../infrastructure/client-system.api.js";
import { ClientFinancialModule } from "./client-financial.module.js";
import { ClientHomeModule } from "./system/client-home.module.js";
import { ClientShellModule } from "./system/client-shell.module.js";
import { ClientStagesApprovalsModule } from "./system/client-stages-approvals.module.js";

export class ClientSystemModules {
    private readonly financial: ClientFinancialModule;
    private readonly home: ClientHomeModule;
    private readonly shell: ClientShellModule;
    private readonly stagesApprovals: ClientStagesApprovalsModule;

    constructor(
        private readonly view: ClientSystemView,
        private readonly models: system,
        private readonly briefing: ClientBriefingController,
        private readonly api: ClientSystemApi,
        private readonly token: string,
        private readonly navigate: (route: ClientRoute) => void
    ) {
        this.financial = new ClientFinancialModule(view, models, api, token, navigate);
        this.home = new ClientHomeModule(view, models.home, navigate);
        this.shell = new ClientShellModule(view, models.base, token, navigate);
        this.stagesApprovals = new ClientStagesApprovalsModule(
            view,
            models["stages-approvals"],
            api,
            token,
            navigate
        );
    }

    mount(route: ClientRoute, briefingStep?: number): void {
        if (route !== "financial") this.financial.dispose();
        if (route !== "stages-approvals") this.stagesApprovals.dispose();
        document.body.classList.toggle("client-briefing-active", route === "briefing");
        switch (route) {
            case "base":
                this.shell.mount();
                break;
            case "home":
                this.home.mount(this.shell.homeNavigation);
                break;
            case "briefing":
                this.mountBriefing(briefingStep);
                break;
            case "stages-approvals":
                void this.stagesApprovals.mount(this.shell.stagesNavigation);
                break;
            case "financial":
                void this.financial.mount(this.shell.baseElements);
                break;
        }
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
