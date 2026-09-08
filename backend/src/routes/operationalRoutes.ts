import express from "express";
import diagnosticRoutes from "./diagnosticRoutes.js";
import testRoutes from "./testRoutes.js";

export function createOperationalRoutes(isProduction: boolean) {
    const router = express.Router();
    router.use(diagnosticRoutes);
    if (!isProduction) router.use(testRoutes);
    return router;
}
