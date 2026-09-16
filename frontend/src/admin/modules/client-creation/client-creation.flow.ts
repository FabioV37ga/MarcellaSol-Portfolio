import { AdminBriefingController } from "@/admin/controllers/newClient/briefing.controller.js";
import type { AdminSession } from "@/admin/infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "@/admin/infrastructure/clients.api.js";
import type { AdminViewsGateway } from "@/admin/infrastructure/views.api.js";
import type { AdminRoute } from "@/admin/navigation/admin-system.router.js";
import { AdminBriefingNavigator } from "@/admin/navigation/admin-briefing.navigator.js";
import { finishBriefing } from "@/admin/templates/briefing/briefing.template.js";
import type { briefing } from "@/admin/templates/interface.js";
import type { AdminSystemView } from "@/admin/views/adminSystem.view.js";
import { ClientCreationSubmission } from "./client-creation-submission.js";
import { ClientCreationDraft, type NewClientCredentials } from "./client-creation-draft.js";

type BriefingRoute = "briefing-home" | "briefing-investment" | "briefing-rooms" | "briefing-finish";

export class ClientCreationFlow {
    private draft?: ClientCreationDraft;
    private briefing?: AdminBriefingController;
    private models?: briefing;
    private readonly submission: ClientCreationSubmission;

    constructor(
        private readonly view: AdminSystemView,
        private readonly api: Pick<AdminClientsGateway, "createClient"> & Pick<AdminViewsGateway, "loadBriefingViews">,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute) => void
    ) {
        this.submission = new ClientCreationSubmission(api, session, () => navigate("clients"));
    }

    async start(name: string, login: string, password: string): Promise<void> {
        if (!name || !login || !password) return;

        if (this.draft && this.briefing && this.models) {
            this.draft.update({ name, login, password });
            this.briefing.setClientName(name);
            this.navigate("briefing-home");
            return;
        }

        this.draft = new ClientCreationDraft({ name, login, password });
        this.briefing = new AdminBriefingController(
            this.api,
            this.session,
            new AdminBriefingNavigator(this.navigate)
        );
        this.models = await this.briefing.loadModels(name) as briefing;
        this.navigate("briefing-home");
    }

    getCredentials(): NewClientCredentials | undefined {
        return this.draft?.getCredentials();
    }

    reset(): void {
        this.draft = undefined;
        this.briefing = undefined;
        this.models = undefined;
    }

    mount(route: BriefingRoute): void {
        if (!this.draft || !this.briefing || !this.models) return;

        switch (route) {
            case "briefing-home":
                this.view.render(this.models.home!, ".page-content");
                this.briefing.mount("home");
                break;
            case "briefing-investment":
                this.view.render(this.models.investment!, ".page-content");
                this.briefing.mount("investment");
                break;
            case "briefing-rooms":
                this.view.render(this.models.rooms!, ".page-content");
                this.briefing.mount("rooms");
                break;
            case "briefing-finish":
                this.mountConfirmation();
                break;
        }
    }

    private mountConfirmation(): void {
        const clientObject = this.draft!.toPayload(this.briefing!.getBriefingObject());
        const description = clientObject.briefing.description;
        const page = finishBriefing(
            clientObject.briefing.investmentFlexibility ?? false,
            clientObject.briefing.rooms ?? [],
            {
                clientName: clientObject.name,
                projectName: description?.name,
                category: description?.category,
                propertyType: description?.type,
                adultAmount: description?.adultAmount,
                childrenAmount: description?.childrenAmount
            }
        );
        this.view.render(page, ".page-content");
        this.briefing!.mount("finish", () => {
            void this.submission.submit(this.draft!.toPayload(this.briefing!.getBriefingObject()));
        });
    }
}
