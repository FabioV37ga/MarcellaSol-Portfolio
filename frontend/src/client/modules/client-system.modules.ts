import type ClientBriefingController from "../controllers/briefing.controller.js";
import type { ClientRoute } from "../navigation/client-system.router.js";
import type { system } from "../templates/interface.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import { ClientSystemApi } from "../infrastructure/client-system.api.js";
import { ClientFinancialModule } from "./client-financial.module.js";
import { ClientBriefingRouteModule } from "./system/client-briefing-route.module.js";
import { ClientHomeModule } from "./system/client-home.module.js";
import { ClientShellModule } from "./system/client-shell.module.js";
import { ClientStagesApprovalsModule } from "./system/client-stages-approvals.module.js";
import { SessionVisualCache } from "@/shared/visual-persistence/session-visual-cache.js";
import { VisualPersistenceController } from "@/shared/visual-persistence/visual-persistence.controller.js";

export class ClientSystemModules {
    private readonly briefing: ClientBriefingRouteModule;
    private readonly financial: ClientFinancialModule;
    private readonly home: ClientHomeModule;
    private readonly shell: ClientShellModule;
    private readonly stagesApprovals: ClientStagesApprovalsModule;
    private readonly visualPersistence: VisualPersistenceController;

    constructor(
        view: ClientSystemView,
        models: system,
        briefing: ClientBriefingController,
        api: ClientSystemApi,
        token: string,
        subjectId: string,
        navigate: (route: ClientRoute) => void
    ) {
        this.visualPersistence = new VisualPersistenceController(new SessionVisualCache({
            role: "client",
            subjectId
        }));
        this.briefing = new ClientBriefingRouteModule(view, briefing);
        this.financial = new ClientFinancialModule(view, models, api, token, navigate, this.visualPersistence);
        this.home = new ClientHomeModule(view, models.home, navigate);
        this.shell = new ClientShellModule(
            view,
            models.base,
            token,
            navigate,
            () => this.visualPersistence.dispose()
        );
        this.stagesApprovals = new ClientStagesApprovalsModule(
            view,
            models["stages-approvals"],
            api,
            token,
            navigate,
            this.visualPersistence
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
                this.briefing.mount(briefingStep);
                break;
            case "stages-approvals":
                void this.stagesApprovals.mount(this.shell.stagesNavigation);
                break;
            case "financial":
                void this.financial.mount(this.shell.baseElements);
                break;
        }
    }
}
