import type ClientBriefingController from "../../controllers/briefing.controller.js";
import type { ClientSystemView } from "../../views/clientSystem.view.js";

type ClientBriefingScreen = Pick<
    ClientBriefingController,
    "getTemplate" | "initialize" | "navigateToStep"
>;

export class ClientBriefingRouteModule {
    constructor(
        private readonly view: ClientSystemView,
        private readonly briefing: ClientBriefingScreen
    ) { }

    mount(step?: number): void {
        const template = this.briefing.getTemplate();
        if (!template.isConnected) {
            this.view.mountOwned(template, "body");
            this.briefing.initialize();
        }
        if (Number.isInteger(step)) this.briefing.navigateToStep(step!);
    }
}
