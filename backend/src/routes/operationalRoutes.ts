import express from "express";
import diagnosticRoutes from "./diagnosticRoutes.js";
import createTestRoutes from "./testRoutes.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";

export function createOperationalRoutes(isProduction: boolean, requireAuthentication: AuthenticationGuard) {
    const router = express.Router();
    router.use(diagnosticRoutes);
    if (!isProduction) router.use(createTestRoutes(requireAuthentication));
    return router;
}
