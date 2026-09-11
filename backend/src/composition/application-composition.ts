import type { ApplicationConfig } from "../config/application-config.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { BriefingFolderAccessService } from "../application/briefing-folder-access.service.js";
import { ClientBriefingReportService } from "../application/client-briefing-report.service.js";
import { ClientPaymentService } from "../application/client-payment.service.js";
import { ClientProposalService } from "../application/client-proposal.service.js";
import { CreateClientService } from "../application/create-client.service.js";
import { DeleteClientService } from "../application/delete-client.service.js";
import { PixPresentationService } from "../application/financial/pix-presentation.service.js";
import { ListClientsService } from "../application/list-clients.service.js";
import { SubmitBriefingService } from "../application/submit-briefing.service.js";
import { UpdateClientProjectStageService } from "../application/update-client-project-stage.service.js";
import { AdminController } from "../controllers/admin.controller.js";
import { ClientController } from "../controllers/client.controller.js";
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
    admin: AdminController;
    client: ClientController;
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
    const sessions = new SessionService(new SessionTokenService(), new SessionRepository());

    const authenticate = new AuthenticateService(new AdminRepository(), clients, passwords, sessions);
    const folderAccess = new BriefingFolderAccessService(drive);
    const submitBriefing = new SubmitBriefingService(clients, briefings, drive, folderAccess);
    const paymentService = new ClientPaymentService(
        config.pixReceiver,
        clients,
        payments,
        new PixPresentationService(config.pixReceiver)
    );
    const proposalService = new ClientProposalService(clients, proposals, drive);

    return {
        admin: new AdminController(
            paymentService,
            new CreateClientService(clients, passwords, drive),
            authenticate,
            new ListClientsService(clients, briefings),
            new ClientBriefingReportService(clients, briefings, drive),
            proposalService,
            new UpdateClientProjectStageService(clients),
            new DeleteClientService(clients, new ClientDeletionRepository(), drive),
            sessions
        ),
        client: new ClientController(
            paymentService,
            clients,
            submitBriefing,
            authenticate,
            proposalService,
            sessions
        ),
        views: new ViewController(views, clients),
        requireAuthentication: createAuthenticationGuard(sessions)
    };
}
