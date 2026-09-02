import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";
import { adminLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";

const router = express.Router();
const controller = new AdminController();

router.post("/api/admin/login", adminLoginRateLimit, controller.login);
router.post("/api/admin/logout", requireAuthentication("admin"), controller.logout);
router.get("/api/admin/session", requireAuthentication("admin"), controller.session);
router.get("/api/admin/clients", requireAuthentication("admin"), controller.clients);
router.get("/api/admin/clients/:id", requireAuthentication("admin"), controller.client);
router.patch("/api/admin/clients/:id/project-stage", requireAuthentication("admin"), controller.updateClientProjectStage);
router.get("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), controller.briefingReportStatus);
router.post("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), controller.generateBriefingReport);
router.get("/api/admin/clients/:id/proposals", requireAuthentication("admin"), controller.clientProposals);
router.post("/api/admin/clients/:id/proposals", requireAuthentication("admin"), receiveProposalAttachment, controller.createClientProposal);
router.put("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), receiveProposalAttachment, controller.editClientProposal);
router.post("/api/admin/clients/:id/proposals/:proposalId/resend", requireAuthentication("admin"), controller.resendClientProposal);
router.delete("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), controller.deleteClientProposal);
router.post("/api/admin/user", requireAuthentication("admin"), controller.create);

export default router;
