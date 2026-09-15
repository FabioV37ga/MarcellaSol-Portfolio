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
import type { AdminPaymentsController } from "../controllers/admin-payments.controller.js";
import type { ClientPaymentsController } from "../controllers/client-payments.controller.js";
import type { AdminProposalsController } from "../controllers/admin-proposals.controller.js";
import type { AdminReportsController } from "../controllers/admin-reports.controller.js";
import type { ClientApprovalsController } from "../controllers/client-approvals.controller.js";

interface RouteControllers {
    admin: AdminController;
    client: ClientController;
    adminPayments: AdminPaymentsController;
    clientPayments: ClientPaymentsController;
    adminProposals: AdminProposalsController;
    adminReports: AdminReportsController;
    clientApprovals: ClientApprovalsController;
    views: ViewController;
    requireAuthentication: AuthenticationGuard;
}

const routes = (app: Application, controllers: RouteControllers, isProduction: boolean) => {
    app.use(express.json({ limit: "100kb" }));
    app.use(createOperationalRoutes(isProduction, controllers.requireAuthentication));
    app.use(
        createAdminRoutes(controllers.admin, controllers.requireAuthentication, controllers.adminPayments,
            controllers.adminProposals, controllers.adminReports),
        createClientRoutes(controllers.client, controllers.requireAuthentication, controllers.clientPayments, controllers.clientApprovals),
        createViewRoutes(controllers.views, controllers.requireAuthentication)
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
}

export default routes;
