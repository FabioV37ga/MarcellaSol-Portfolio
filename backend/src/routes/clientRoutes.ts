import express from "express";
import type { ClientPaymentsController } from "../controllers/client-payments.controller.js";
import { asyncRoute } from "../middleware/async-route.js";
import type { ClientApprovalsController } from "../controllers/client-approvals.controller.js";
import type { ClientBriefingController } from "../controllers/client-briefing.controller.js";
import type { ClientSessionsController } from "../controllers/client-sessions.controller.js";
import { receiveBriefingFiles } from "../middleware/briefing-upload.middleware.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { clientLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { financialMutationRateLimit, financialReadRateLimit } from "../middleware/financial-rate-limit.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";

export default function clientRoutes(
    briefing: ClientBriefingController,
    requireAuthentication: AuthenticationGuard,
    payments: ClientPaymentsController,
    approvals: ClientApprovalsController,
    sessions: ClientSessionsController
) {
    const router = express.Router();
    const decisionErrorPolicy = { unexpectedMessage: "Erro interno ao registrar decisão." };

    router.post("/api/client/login", clientLoginRateLimit, asyncRoute(sessions.login, { unexpectedMessage: "Erro interno ao autenticar cliente" }));
    router.post("/api/client/logout", requireAuthentication("client"), asyncRoute(sessions.logout, { unexpectedMessage: "Erro interno ao encerrar sessão" }));
    router.get("/api/client/session", requireAuthentication("client"), asyncRoute(sessions.session, { unexpectedMessage: "Erro interno ao consultar sessão" }));
    router.get("/api/client/proposals", requireAuthentication("client"), asyncRoute(approvals.approvals, { unexpectedMessage: "Erro ao carregar aprovações." }));
    router.get("/api/client/payments", requireAuthentication("client"), financialReadRateLimit, asyncRoute(payments.payments, { unexpectedMessage: "Erro ao carregar pagamentos." }));
    router.post("/api/client/payments/:paymentId/pix", requireAuthentication("client"), financialMutationRateLimit, asyncRoute(payments.generatePaymentPix, { unexpectedMessage: "Não foi possível gerar o código Pix." }));
    router.post("/api/client/proposals/:proposalId/approve", requireAuthentication("client"), receiveProposalAttachment, asyncRoute(approvals.approveProposal, decisionErrorPolicy));
    router.post("/api/client/proposals/:proposalId/beat", requireAuthentication("client"), receiveProposalAttachment, asyncRoute(approvals.beatProposal, decisionErrorPolicy));
    router.post("/api/client/briefing", requireAuthentication("client"), receiveBriefingFiles,
        asyncRoute(briefing.submit, { unexpectedMessage: "Erro interno ao salvar briefing" }));

    return router;
}
