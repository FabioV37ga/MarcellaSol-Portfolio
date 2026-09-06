import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuthentication } from "../middleware/authentication.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";
import { adminLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { financialMutationRateLimit, financialReadRateLimit } from "../middleware/financial-rate-limit.middleware.js";

export default function adminRoutes(controller: AdminController) {
    const router = express.Router();

    router.post("/api/admin/login", adminLoginRateLimit, controller.login);
    router.post("/api/admin/logout", requireAuthentication("admin"), controller.logout);
    router.get("/api/admin/session", requireAuthentication("admin"), controller.session);
    router.get("/api/admin/clients", requireAuthentication("admin"), controller.clients);
    router.get("/api/admin/clients/:id", requireAuthentication("admin"), controller.client);
    router.delete("/api/admin/clients/:id", requireAuthentication("admin"), controller.removeClient);
    router.patch("/api/admin/clients/:id/project-stage", requireAuthentication("admin"), controller.updateClientProjectStage);
    router.put("/api/admin/clients/:id/project-stages/order", requireAuthentication("admin"), controller.updateClientProjectStageOrder);
    router.get("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), controller.briefingReportStatus);
    router.post("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), controller.generateBriefingReport);
    router.get("/api/admin/clients/:id/proposals", requireAuthentication("admin"), controller.clientProposals);
    router.post("/api/admin/clients/:id/proposals", requireAuthentication("admin"), receiveProposalAttachment, controller.createClientProposal);
    router.put("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), receiveProposalAttachment, controller.editClientProposal);
    router.post("/api/admin/clients/:id/proposals/:proposalId/resend", requireAuthentication("admin"), controller.resendClientProposal);
    router.delete("/api/admin/clients/:id/proposals/:proposalId/attachments/:attachmentIndex", requireAuthentication("admin"), controller.deleteClientProposalAttachment);
    router.delete("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), controller.deleteClientProposal);
    router.post("/api/admin/payments/preview", requireAuthentication("admin"), financialReadRateLimit, controller.previewClientPayment);
    router.get("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialReadRateLimit, controller.clientPayments);
    router.post("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialMutationRateLimit, controller.createClientPayment);
    router.put("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, controller.editClientPayment);
    router.delete("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, controller.removeClientPayment);
    router.patch("/api/admin/clients/:id/payments/:paymentId/down-payment", requireAuthentication("admin"), financialMutationRateLimit, controller.setDownPaymentPaid);
    router.patch("/api/admin/clients/:id/payments/:paymentId/installments/:installmentNumber", requireAuthentication("admin"), financialMutationRateLimit, controller.setInstallmentPaid);
    router.post("/api/admin/user", requireAuthentication("admin"), controller.create);

    return router;
}
