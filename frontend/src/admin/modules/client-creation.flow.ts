import u from "umbrellajs";
import { newClient } from "../controllers/newClient/newClient.controller.js";
import type { AdminSession, AdminSystemApi } from "../infrastructure/admin-system.api.js";
import type { AdminRoute } from "../navigation/admin-system.router.js";
import { finishBriefing } from "../templates/briefing/briefing.template.js";
import type { briefing } from "../templates/interface.js";
import type { AdminSystemView } from "../views/adminSystem.view.js";

type BriefingRoute = "briefing-home" | "briefing-investment" | "briefing-rooms" | "briefing-finish";

export class ClientCreationFlow {
    private client?: newClient;
    private models?: briefing;

    constructor(
        private readonly view: AdminSystemView,
        private readonly api: AdminSystemApi,
        private readonly session: AdminSession,
        private readonly navigate: (route: AdminRoute) => void
    ) {}

    async start(name: string, login: string, password: string): Promise<void> {
        if (!name || !login || !password) return;

        this.client = new newClient(
            name,
            login,
            password,
            this.session.token
        );
        this.models = await this.client.getModels() as briefing;
        this.navigate("briefing-home");
    }

    mount(route: BriefingRoute): void {
        if (!this.client || !this.models) return;

        switch (route) {
            case "briefing-home":
                this.view.render(this.models.home!, ".page-content");
                this.client.addUserInteractions("home", (next: AdminRoute) => this.navigate(next));
                break;
            case "briefing-investment":
                this.view.render(this.models.investment!, ".page-content");
                this.client.addUserInteractions("investment", (next: AdminRoute) => this.navigate(next));
                break;
            case "briefing-rooms":
                this.view.render(this.models.rooms!, ".page-content");
                this.client.addUserInteractions("rooms", (next: string) => {
                    if (next === "briefing-finish") this.navigate(next);
                });
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
                residentAmount: description?.residentAmount
            }
        );
        this.view.render(page, ".page-content");
        this.client!.addUserInteractions("finish", () => { void this.commit(); });
    }

    private async commit(): Promise<void> {
        const finishButton = u("#briefing-finish-confirm").first() as HTMLButtonElement | undefined;
        if (finishButton) finishButton.disabled = true;

        try {
            const clientObject = this.client!.returnClientObject();
            const createdClient = await this.api.createClient(this.session, clientObject);
            console.log("Cliente criado com sucesso:", createdClient);
            this.navigate("clients");
        } catch (error) {
            console.error("Erro ao criar cliente:", error);
            if (finishButton) finishButton.disabled = false;
        }
    }
}
