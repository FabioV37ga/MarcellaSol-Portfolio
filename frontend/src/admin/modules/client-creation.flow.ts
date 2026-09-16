import { newClient, type NewClientCredentials } from "../controllers/newClient/newClient.controller.js";
import type { AdminSession } from "../infrastructure/admin-system.api.js";
import type { AdminClientsGateway } from "../infrastructure/clients.api.js";
import type { AdminViewsGateway } from "../infrastructure/views.api.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import { AdminBriefingNavigator } from "../navigation/admin-briefing.navigator.js";
import { finishBriefing } from "../templates/briefing/briefing.template.js";
import type { briefing } from "../templates/interface.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";
import { ClientCreationSubmission } from "./client-creation-submission.js";

type BriefingRoute = "briefing-home" | "briefing-investment" | "briefing-rooms" | "briefing-finish";

export class ClientCreationFlow {
    private client?: newClient;
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

        if (this.client && this.models) {
            this.client.updateCredentials({ name, login, password });
            this.navigate("briefing-home");
            return;
        }

        this.client = new newClient(
            name,
            login,
            password,
            this.api,
            this.session,
            new AdminBriefingNavigator(this.navigate)
        );
        this.models = await this.client.getModels() as briefing;
        this.navigate("briefing-home");
    }

    getCredentials(): NewClientCredentials | undefined {
        return this.client?.getCredentials();
    }

    reset(): void {
        this.client = undefined;
        this.models = undefined;
    }

    mount(route: BriefingRoute): void {
        if (!this.client || !this.models) return;

        switch (route) {
            case "briefing-home":
                this.view.render(this.models.home!, ".page-content");
                this.client.addUserInteractions("home");
                break;
            case "briefing-investment":
                this.view.render(this.models.investment!, ".page-content");
                this.client.addUserInteractions("investment");
                break;
            case "briefing-rooms":
                this.view.render(this.models.rooms!, ".page-content");
                this.client.addUserInteractions("rooms");
                break;
            case "briefing-finish":
                this.mountConfirmation();
                break;
        }
    }

    private mountConfirmation(): void {
        const clientObject = this.client!.returnClientObject();
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
        this.client!.addUserInteractions("finish", () => {
            void this.submission.submit(this.client!.returnClientObject());
        });
    }
}
