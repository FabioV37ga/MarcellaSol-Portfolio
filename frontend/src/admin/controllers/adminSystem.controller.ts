import { AdminSystemApi, type AdminSession } from "../infrastructure/admin-system.api.js";
import { AdminSystemModules } from "../modules/admin-system.modules.js";
import { ClientCreationFlow } from "../modules/client-creation.flow.js";
import { AdminSystemRouter, type AdminRoute } from "../navigation/admin-system.router.js";
import getTemplates from "../templates/getter.js";
import { AdminSystemView } from "../views/adminSystem.view.js";

export default class AdminSystem {
    private readonly api = new AdminSystemApi();
    private router?: AdminSystemRouter;

    constructor(
        token: string,
        private readonly name: string
    ) {
        void this.initialize({ token });
    }

    private async initialize(session: AdminSession): Promise<void> {
        const databaseViews = await this.api.loadViews(session);
        if (!databaseViews) return;

        const models = getTemplates("system", databaseViews, this.name);
        const view = new AdminSystemView();
        let modules: AdminSystemModules;
        this.router = new AdminSystemRouter(route => modules.mount(route));
        const navigate = (route: AdminRoute) => this.router?.navigate(route);
        const clientCreation = new ClientCreationFlow(view, this.api, session, navigate);
        modules = new AdminSystemModules(view, models, clientCreation, navigate);
        this.router.start();
    }
}
