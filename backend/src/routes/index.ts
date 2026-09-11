import express, { type Application } from "express";
import { createOperationalRoutes } from "./operationalRoutes.js";
import createAdminRoutes from "./adminRoutes.js";
import createViewRoutes from "./viewRoutes.js";
import createClientRoutes from "./clientRoutes.js"
import { errorHandler, notFoundHandler } from "../middleware/error-handler.middleware.js";
import type { AdminController } from "../controllers/admin.controller.js";
import type { ClientController } from "../controllers/client.controller.js";
import type { ViewController } from "../controllers/view.controller.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";

interface RouteControllers {
    admin: AdminController;
    client: ClientController;
    views: ViewController;
    requireAuthentication: AuthenticationGuard;
}

const routes = (app: Application, controllers: RouteControllers, isProduction: boolean) => {
    app.use(express.json({ limit: "100kb" }));
    app.use(createOperationalRoutes(isProduction, controllers.requireAuthentication));
    app.use(
        createAdminRoutes(controllers.admin, controllers.requireAuthentication),
        createClientRoutes(controllers.client, controllers.requireAuthentication),
        createViewRoutes(controllers.views, controllers.requireAuthentication)
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
}

export default routes;
