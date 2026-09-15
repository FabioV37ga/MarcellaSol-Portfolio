import express from "express";
import type { AdminPaymentsController } from "../controllers/admin-payments.controller.js";
import { asyncRoute } from "../middleware/async-route.js";
import { AdminController } from "../controllers/admin.controller.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";
import { adminLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { financialMutationRateLimit, financialReadRateLimit } from "../middleware/financial-rate-limit.middleware.js";

export default function adminRoutes(controller: AdminController, requireAuthentication: AuthenticationGuard, payments: AdminPaymentsController) {
    const router = express.Router();
    const paymentErrorPolicy = {
        unexpectedMessage: "Erro interno ao processar pagamento",
        invalidDataMessage: "Dados do pagamento inválidos"
    };

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
    router.post("/api/admin/payments/preview", requireAuthentication("admin"), financialReadRateLimit, asyncRoute(payments.previewClientPayment, paymentErrorPolicy));
    router.get("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialReadRateLimit, asyncRoute(payments.clientPayments, paymentErrorPolicy));
    router.post("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.createClientPayment, paymentErrorPolicy));
    router.put("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.editClientPayment, paymentErrorPolicy));
    router.delete("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.removeClientPayment, paymentErrorPolicy));
    router.patch("/api/admin/clients/:id/payments/:paymentId/down-payment", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.setDownPaymentPaid, paymentErrorPolicy));
    router.patch("/api/admin/clients/:id/payments/:paymentId/installments/:installmentNumber", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.setInstallmentPaid, paymentErrorPolicy));
    router.post("/api/admin/user", requireAuthentication("admin"), controller.create);

    return router;
}
