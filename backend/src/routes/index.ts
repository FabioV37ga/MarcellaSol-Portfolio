import express, { type Application } from "express";
import { createOperationalRoutes } from "./operationalRoutes.js";
import createAdminRoutes from "./adminRoutes.js";
import createViewRoutes from "./viewRoutes.js";
import createClientRoutes from "./clientRoutes.js"
import { errorHandler, notFoundHandler } from "../middleware/error-handler.middleware.js";
import type { AdminSessionsController } from "../controllers/admin-sessions.controller.js";
import type { AdminClientsController } from "../controllers/admin-clients.controller.js";
import type { ClientBriefingController } from "../controllers/client-briefing.controller.js";
import type { ClientSessionsController } from "../controllers/client-sessions.controller.js";
import type { AdminViewsController } from "../controllers/admin-views.controller.js";
import type { ClientViewsController } from "../controllers/client-views.controller.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import type { AdminPaymentsController } from "../controllers/admin-payments.controller.js";
import type { ClientPaymentsController } from "../controllers/client-payments.controller.js";
import type { AdminProposalsController } from "../controllers/admin-proposals.controller.js";
import type { AdminReportsController } from "../controllers/admin-reports.controller.js";
import type { ClientApprovalsController } from "../controllers/client-approvals.controller.js";

interface RouteControllers {
    adminSessions: AdminSessionsController;
    adminClients: AdminClientsController;
    clientBriefing: ClientBriefingController;
    clientSessions: ClientSessionsController;
    adminPayments: AdminPaymentsController;
    clientPayments: ClientPaymentsController;
    adminProposals: AdminProposalsController;
    adminReports: AdminReportsController;
    clientApprovals: ClientApprovalsController;
    adminViews: AdminViewsController;
    clientViews: ClientViewsController;
    requireAuthentication: AuthenticationGuard;
}

const routes = (app: Application, controllers: RouteControllers, isProduction: boolean) => {
    app.use(express.json({ limit: "100kb" }));
    app.use(createOperationalRoutes(isProduction, controllers.requireAuthentication));
    app.use(
        createAdminRoutes(controllers.adminSessions, controllers.requireAuthentication, controllers.adminPayments,
            controllers.adminProposals, controllers.adminReports, controllers.adminClients),
        createClientRoutes(controllers.clientBriefing, controllers.requireAuthentication, controllers.clientPayments,
            controllers.clientApprovals, controllers.clientSessions),
        createViewRoutes(controllers.adminViews, controllers.clientViews, controllers.requireAuthentication)
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
}

export default routes;
