import type { ApplicationConfig } from "../config/application-config.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { BriefingFolderAccessService } from "../application/briefing-folder-access.service.js";
import { ClientBriefingReportService } from "../application/client-briefing-report.service.js";
import { ClientPaymentService } from "../application/client-payment.service.js";
import { ClientProposalService } from "../application/client-proposal.service.js";
import { ClientProposalResponseService } from "../application/client-proposal-response.service.js";
import { CreateClientService } from "../application/create-client.service.js";
import { DeleteClientService } from "../application/delete-client.service.js";
import { PixPresentationService } from "../application/financial/pix-presentation.service.js";
import { ListClientsService } from "../application/list-clients.service.js";
import { ListClientApprovalsService } from "../application/list-client-approvals.service.js";
import { SubmitBriefingService } from "../application/submit-briefing.service.js";
import { UpdateClientProjectStageService } from "../application/update-client-project-stage.service.js";
import { SystemClock } from "../application/ports/clock.js";
import { RandomUuidGenerator } from "../application/ports/id-generator.js";
import { AdminSessionsController } from "../controllers/admin-sessions.controller.js";
import { AdminClientsController } from "../controllers/admin-clients.controller.js";
import { AdminPaymentsController } from "../controllers/admin-payments.controller.js";
import { ClientPaymentsController } from "../controllers/client-payments.controller.js";
import { ClientController } from "../controllers/client.controller.js";
import { ClientSessionsController } from "../controllers/client-sessions.controller.js";
import { AdminProposalsController } from "../controllers/admin-proposals.controller.js";
import { AdminReportsController } from "../controllers/admin-reports.controller.js";
import { ClientApprovalsController } from "../controllers/client-approvals.controller.js";
import { ViewController } from "../controllers/view.controller.js";
import { createAuthenticationGuard, type AuthenticationGuard } from "../middleware/authentication.middleware.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientDeletionRepository } from "../repositories/client-deletion.repository.js";
import { ClientPaymentRepository } from "../repositories/client-payment.repository.js";
import { ClientProposalRepository } from "../repositories/client-proposal.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { ViewRepository } from "../repositories/view.repository.js";
import { GoogleDriveAttachmentStorage } from "../services/attachment-storage.js";
import { PasswordService } from "../services/password.service.js";
import { SessionService } from "../services/session.service.js";
import { SessionTokenService } from "../services/session-token.service.js";

export interface ApplicationComposition {
    adminSessions: AdminSessionsController;
    adminClients: AdminClientsController;
    client: ClientController;
    clientSessions: ClientSessionsController;
    adminPayments: AdminPaymentsController;
    clientPayments: ClientPaymentsController;
    adminProposals: AdminProposalsController;
    adminReports: AdminReportsController;
    clientApprovals: ClientApprovalsController;
    views: ViewController;
    requireAuthentication: AuthenticationGuard;
}

export function createApplicationComposition(config: ApplicationConfig): ApplicationComposition {
    const clients = new ClientRepository();
    const briefings = new ClientBriefingRepository();
    const proposals = new ClientProposalRepository();
    const payments = new ClientPaymentRepository();
    const views = new ViewRepository();
    const drive = new GoogleDriveAttachmentStorage();
    const passwords = new PasswordService();
    const clock = new SystemClock();
    const ids = new RandomUuidGenerator();
    const sessions = new SessionService(new SessionTokenService(), new SessionRepository());

    const authenticate = new AuthenticateService(new AdminRepository(), clients, passwords, sessions);
    const folderAccess = new BriefingFolderAccessService(drive);
    const submitBriefing = new SubmitBriefingService(clients, briefings, drive, folderAccess, clock);
    const paymentService = new ClientPaymentService(
        config.pixReceiver,
        clients,
        payments,
        new PixPresentationService(config.pixReceiver),
        clock,
        ids
    );
    const proposalResponses = new ClientProposalResponseService(clients, proposals, drive);
    const proposalService = new ClientProposalService(clients, proposals, drive, proposalResponses);

    return {
        adminSessions: new AdminSessionsController(authenticate, sessions),
        adminClients: new AdminClientsController(
            new CreateClientService(clients, passwords, drive),
            new ListClientsService(clients, briefings),
            new UpdateClientProjectStageService(clients),
            new DeleteClientService(clients, new ClientDeletionRepository(), drive)
        ),
        client: new ClientController(submitBriefing),
        clientSessions: new ClientSessionsController(clients, authenticate, sessions),
        views: new ViewController(views, clients),
        adminPayments: new AdminPaymentsController(paymentService),
        clientPayments: new ClientPaymentsController(paymentService),
        adminProposals: new AdminProposalsController(proposalService),
        adminReports: new AdminReportsController(new ClientBriefingReportService(clients, briefings, drive)),
        clientApprovals: new ClientApprovalsController(new ListClientApprovalsService(clients, proposalService), proposalResponses),
        requireAuthentication: createAuthenticationGuard(sessions)
    };
}
