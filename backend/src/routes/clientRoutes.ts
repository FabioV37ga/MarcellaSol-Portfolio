import express from "express";
import { ClientController } from "../controllers/client.controller.js";
import { receiveBriefingFiles } from "../middleware/briefing-upload.middleware.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";
import { clientLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";

const router = express.Router();
const controller = new ClientController();

router.post("/api/client/login", clientLoginRateLimit, controller.login);
router.post("/api/client/logout", requireAuthentication("client"), controller.logout);
router.get("/api/client/session", requireAuthentication("client"), controller.session);
router.get("/api/client/proposals", requireAuthentication("client"), controller.approvals);
router.post("/api/client/proposals/:proposalId/approve", requireAuthentication("client"), controller.approveProposal);
router.post("/api/client/proposals/:proposalId/beat", requireAuthentication("client"), controller.beatProposal);
router.post("/api/client/briefing", requireAuthentication("client"), receiveBriefingFiles, controller.submit);

export default router;
