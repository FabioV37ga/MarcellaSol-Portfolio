import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";

const router = express.Router();
const controller = new AdminController();

router.post("/api/admin/login", controller.login);
router.get("/api/admin/session", requireAuthentication("admin"), controller.session);
router.get("/api/admin/clients", requireAuthentication("admin"), controller.clients);
router.get("/api/admin/clients/:id", requireAuthentication("admin"), controller.client);
router.post("/api/admin/user", requireAuthentication("admin"), controller.create);

export default router;
