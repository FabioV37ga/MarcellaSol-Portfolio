import express from "express";
import type { ClientPaymentsController } from "../controllers/client-payments.controller.js";
import { asyncRoute } from "../middleware/async-route.js";
import { ClientController } from "../controllers/client.controller.js";
import { receiveBriefingFiles } from "../middleware/briefing-upload.middleware.js";
import type { AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { clientLoginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { financialMutationRateLimit, financialReadRateLimit } from "../middleware/financial-rate-limit.middleware.js";
import { receiveProposalAttachment } from "../middleware/proposal-upload.middleware.js";

export default function clientRoutes(controller: ClientController, requireAuthentication: AuthenticationGuard, payments: ClientPaymentsController) {
    const router = express.Router();

    router.post("/api/client/login", clientLoginRateLimit, controller.login);
    router.post("/api/client/logout", requireAuthentication("client"), controller.logout);
    router.get("/api/client/session", requireAuthentication("client"), controller.session);
    router.get("/api/client/proposals", requireAuthentication("client"), controller.approvals);
    router.get("/api/client/payments", requireAuthentication("client"), financialReadRateLimit, asyncRoute(payments.payments, { unexpectedMessage: "Erro ao carregar pagamentos." }));
    router.post("/api/client/payments/:paymentId/pix", requireAuthentication("client"), financialMutationRateLimit, asyncRoute(payments.generatePaymentPix, { unexpectedMessage: "Não foi possível gerar o código Pix." }));
    router.post("/api/client/proposals/:proposalId/approve", requireAuthentication("client"), receiveProposalAttachment, controller.approveProposal);
    router.post("/api/client/proposals/:proposalId/beat", requireAuthentication("client"), receiveProposalAttachment, controller.beatProposal);
    router.post("/api/client/briefing", requireAuthentication("client"), receiveBriefingFiles, controller.submit);

    return router;
}
