import express, { type Application } from "express";
import testRoutes from "./testRoutes.js";
import adminRoutes from "./adminRoutes.js";
import viewRoutes from "./viewRoutes.js";
import clientRoutes from "./clientRoutes.js"
import { errorHandler, notFoundHandler } from "../middleware/error-handler.middleware.js";


const routes = (app: Application) => {
    app.use(express.json({ limit: "100kb" }));
    app.use(testRoutes, adminRoutes, clientRoutes, viewRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
}

export default routes;
