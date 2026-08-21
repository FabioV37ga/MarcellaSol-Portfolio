import express from "express";
import { ViewController } from "../controllers/view.controller.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";

const router = express.Router();
const controller = new ViewController();

router.post("/api/view/admin", requireAuthentication("admin"), controller.admin);
router.post("/api/view/admin/briefing", requireAuthentication("admin"), controller.adminBriefing);
router.post("/api/view/client", requireAuthentication("client"), controller.client);

export default router;
