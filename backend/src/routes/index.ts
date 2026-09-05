import express, { type Application } from "express";
import testRoutes from "./testRoutes.js";
import createAdminRoutes from "./adminRoutes.js";
import viewRoutes from "./viewRoutes.js";
import createClientRoutes from "./clientRoutes.js"
import { errorHandler, notFoundHandler } from "../middleware/error-handler.middleware.js";
import type { AdminController } from "../controllers/admin.controller.js";
import type { ClientController } from "../controllers/client.controller.js";

interface RouteControllers {
    admin: AdminController;
    client: ClientController;
}

const routes = (app: Application, controllers: RouteControllers) => {
    app.use(express.json({ limit: "100kb" }));
    app.use(testRoutes, createAdminRoutes(controllers.admin), createClientRoutes(controllers.client), viewRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
}

export default routes;
