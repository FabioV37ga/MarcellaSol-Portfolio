import express from "express";
import type { ViewController } from "../controllers/view.controller.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";

export default function createViewRoutes(controller: ViewController) {
    const router = express.Router();

    router.post("/api/view/admin", requireAuthentication("admin"), controller.admin);
    router.post("/api/view/admin/briefing", requireAuthentication("admin"), controller.adminBriefing);
    router.post("/api/view/client", requireAuthentication("client"), controller.client);

    return router;
}
