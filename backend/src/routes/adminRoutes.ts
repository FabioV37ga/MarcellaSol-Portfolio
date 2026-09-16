import express from "express";
import type { AdminPaymentsController } from "../controllers/admin-payments.controller.js";
import { asyncRoute } from "../middleware/async-route.js";
import type { AdminProposalsController } from "../controllers/admin-proposals.controller.js";
import type { AdminReportsController } from "../controllers/admin-reports.controller.js";
import type { AdminSessionsController } from "../controllers/admin-sessions.controller.js";
import type { AdminClientsController } from "../controllers/admin-clients.controller.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";
import { adminLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { financialMutationRateLimit, financialReadRateLimit } from "../middleware/financial-rate-limit.middleware.js";

export default function adminRoutes(
    sessions: AdminSessionsController,
    requireAuthentication: AuthenticationGuard,
    payments: AdminPaymentsController,
    proposals: AdminProposalsController,
    reports: AdminReportsController,
    clients: AdminClientsController
) {
    const router = express.Router();
    const paymentErrorPolicy = {
        unexpectedMessage: "Erro interno ao processar pagamento",
        validationErrorMessage: "Dados do pagamento inválidos",
        castErrorMessage: "Dados do pagamento inválidos"
    };
    const proposalErrorPolicy = {
        unexpectedMessage: "Erro interno ao processar proposta",
        validationErrorMessage: "Dados da proposta inválidos"
    };
    const reportErrorPolicy = { unexpectedMessage: "Erro interno ao processar relatório do briefing" };
    const clientValidationPolicy = {
        unexpectedMessage: "Erro interno ao criar cliente",
        validationErrorMessage: "Dados do cliente ou briefing inválidos"
    };

    router.post("/api/admin/login", adminLoginRateLimit, asyncRoute(sessions.login, { unexpectedMessage: "Erro interno ao autenticar administrador" }));
    router.post("/api/admin/logout", requireAuthentication("admin"), asyncRoute(sessions.logout, { unexpectedMessage: "Erro interno ao encerrar sessão" }));
    router.get("/api/admin/session", requireAuthentication("admin"), asyncRoute(sessions.session, { unexpectedMessage: "Erro interno ao consultar sessão" }));
    router.get("/api/admin/clients", requireAuthentication("admin"), asyncRoute(clients.clients, { unexpectedMessage: "Erro interno ao listar clientes" }));
    router.get("/api/admin/clients/:id", requireAuthentication("admin"), asyncRoute(clients.client, { unexpectedMessage: "Erro interno ao buscar cliente" }));
    router.delete("/api/admin/clients/:id", requireAuthentication("admin"), asyncRoute(clients.removeClient, { unexpectedMessage: "Erro interno ao remover cliente" }));
    router.patch("/api/admin/clients/:id/project-stage", requireAuthentication("admin"), asyncRoute(clients.updateClientProjectStage, {
        unexpectedMessage: "Erro interno ao atualizar etapa do cliente", validationErrorMessage: "Etapa ou status inválido"
    }));
    router.put("/api/admin/clients/:id/project-stages/order", requireAuthentication("admin"), asyncRoute(clients.updateClientProjectStageOrder, {
        unexpectedMessage: "Erro interno ao atualizar ordem das etapas do cliente", validationErrorMessage: "Ordem das etapas inválida"
    }));
    router.get("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), asyncRoute(reports.briefingReportStatus, reportErrorPolicy));
    router.post("/api/admin/clients/:id/briefing-report", requireAuthentication("admin"), asyncRoute(reports.generateBriefingReport, reportErrorPolicy));
    router.get("/api/admin/clients/:id/proposals", requireAuthentication("admin"), asyncRoute(proposals.clientProposals, proposalErrorPolicy));
    router.post("/api/admin/clients/:id/proposals", requireAuthentication("admin"), receiveProposalAttachment, asyncRoute(proposals.createClientProposal, proposalErrorPolicy));
    router.put("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), receiveProposalAttachment, asyncRoute(proposals.editClientProposal, proposalErrorPolicy));
    router.post("/api/admin/clients/:id/proposals/:proposalId/complete-changes", requireAuthentication("admin"), asyncRoute(proposals.confirmClientProposalChanges, proposalErrorPolicy));
    router.delete("/api/admin/clients/:id/proposals/:proposalId/attachments/:attachmentIndex", requireAuthentication("admin"), asyncRoute(proposals.deleteClientProposalAttachment, proposalErrorPolicy));
    router.delete("/api/admin/clients/:id/proposals/:proposalId", requireAuthentication("admin"), asyncRoute(proposals.deleteClientProposal, proposalErrorPolicy));
    router.post("/api/admin/payments/preview", requireAuthentication("admin"), financialReadRateLimit, asyncRoute(payments.previewClientPayment, paymentErrorPolicy));
    router.get("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialReadRateLimit, asyncRoute(payments.clientPayments, paymentErrorPolicy));
    router.post("/api/admin/clients/:id/payments", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.createClientPayment, paymentErrorPolicy));
    router.put("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.editClientPayment, paymentErrorPolicy));
    router.delete("/api/admin/clients/:id/payments/:paymentId", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.removeClientPayment, paymentErrorPolicy));
    router.patch("/api/admin/clients/:id/payments/:paymentId/down-payment", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.setDownPaymentPaid, paymentErrorPolicy));
    router.patch("/api/admin/clients/:id/payments/:paymentId/installments/:installmentNumber", requireAuthentication("admin"), financialMutationRateLimit, asyncRoute(payments.setInstallmentPaid, paymentErrorPolicy));
    router.post("/api/admin/user", requireAuthentication("admin"), asyncRoute(clients.create, clientValidationPolicy));

    return router;
}
