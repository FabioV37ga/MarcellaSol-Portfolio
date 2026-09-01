import express from "express";
import { ClientController } from "../controllers/client.controller.js";
import { receiveBriefingFiles } from "../middleware/briefing-upload.middleware.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";

const router = express.Router();
const controller = new ClientController();

router.post("/api/client/login", controller.login);
router.get("/api/client/session", requireAuthentication("client"), controller.session);
router.get("/api/client/proposals", requireAuthentication("client"), controller.approvals);
router.post("/api/client/briefing", requireAuthentication("client"), receiveBriefingFiles, controller.submit);

export default router;
