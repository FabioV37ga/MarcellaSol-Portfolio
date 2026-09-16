import express from "express";
import type { AdminViewsController } from "../controllers/admin-views.controller.js";
import type { ClientViewsController } from "../controllers/client-views.controller.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { asyncRoute } from "../middleware/async-route.js";

export default function createViewRoutes(
    admin: AdminViewsController,
    client: ClientViewsController,
    requireAuthentication: AuthenticationGuard
) {
    const router = express.Router();

    router.post("/api/view/admin", requireAuthentication("admin"),
        asyncRoute(admin.view, { unexpectedMessage: "Erro ao buscar views do administrador." }));
    router.post("/api/view/admin/briefing", requireAuthentication("admin"),
        asyncRoute(admin.briefing, { unexpectedMessage: "Erro ao buscar views do briefing administrativo." }));
    router.post("/api/view/client", requireAuthentication("client"),
        asyncRoute(client.view, { unexpectedMessage: "Erro ao buscar views do cliente." }));

    return router;
}
