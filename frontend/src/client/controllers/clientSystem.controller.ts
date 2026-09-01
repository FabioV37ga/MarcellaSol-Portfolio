import { ClientSystemApi } from "../infrastructure/client-system.api.js";
import { ClientSystemModules } from "../modules/client-system.modules.js";
import { ClientSystemRouter, type ClientRoute } from "../navigation/client-system.router.js";
import getTemplates from "../templates/getter.js";
import { ClientSystemView } from "../views/clientSystem.view.js";
import ClientBriefingController, { normalizeBriefingData } from "./briefing.controller.js";

export default class ClientSystem {
    private readonly api = new ClientSystemApi();
    private router?: ClientSystemRouter;

    constructor(
        private readonly token: string,
        private readonly name: string,
        hasFilledBriefing: boolean
    ) {
        void this.initialize(hasFilledBriefing);
    }

    private async initialize(hasFilledBriefing: boolean): Promise<void> {
        const data = await this.api.load(this.token);
        if (!data) return;

        const models = getTemplates(data.view, this.name);
        const normalizedData = normalizeBriefingData(data, this.name);
        const briefing = new ClientBriefingController(
            normalizedData.clientObject,
            normalizedData.briefingObject,
            this.token
        );
        models.briefing = briefing.getTemplate();

        const view = new ClientSystemView();
        let modules: ClientSystemModules;
        this.router = new ClientSystemRouter((route, step) => modules.mount(route, step));
        modules = new ClientSystemModules(
            view,
            models,
            briefing,
            this.api,
            this.token,
            (route: ClientRoute) => this.router?.navigate(route)
        );

        const initialRoute: ClientRoute = normalizedData.clientObject.hasFilledBriefing || hasFilledBriefing
            ? "base"
            : "briefing";
        this.router.start(initialRoute);
    }
}
