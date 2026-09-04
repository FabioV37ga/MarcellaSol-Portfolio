import type { Request, Response } from "express";
import mongoose from "mongoose";
import { CreateClientService, type CreateClientCommand } from "../application/create-client.service.js";
import { ApplicationError } from "../application/errors/application-error.js";
import { AuthenticateService } from "../application/authenticate.service.js";
import { ListClientsService } from "../application/list-clients.service.js";
import { ClientBriefingReportService } from "../application/client-briefing-report.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";
import { ClientProposalService } from "../application/client-proposal.service.js";
import { SessionService } from "../services/session.service.js";
import { loginCredentials } from "./login-credentials.js";
import { UpdateClientProjectStageService } from "../application/update-client-project-stage.service.js";
import { DeleteClientService } from "../application/delete-client.service.js";
import { ClientPaymentService } from "../application/client-payment.service.js";

export class AdminController {
    constructor(
        private readonly createClient = new CreateClientService(),
        private readonly authenticate = new AuthenticateService(),
        private readonly listClients = new ListClientsService(),
        private readonly briefingReports = new ClientBriefingReportService(),
        private readonly proposals = new ClientProposalService(),
        private readonly projectStages = new UpdateClientProjectStageService(),
        private readonly payments = new ClientPaymentService(),
        private readonly deleteClient = new DeleteClientService(),
        private readonly sessions = new SessionService()
    ) {}

    login = async (request: Request, response: Response): Promise<Response> => {
        try {
            const { login, password } = loginCredentials(request.body);

            const { account, token } = await this.authenticate.execute("admin", login, password);
            return response.status(200).json({ message: "Login bem-sucedido", name: account.name, token });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao autenticar administrador:", error);
            return response.status(500).json({ message: "Erro interno ao autenticar administrador" });
        }
    };

    logout = async (_request: Request, response: Response): Promise<Response> => {
        try {
            await this.sessions.revoke(authenticatedPrincipal(response));
            return response.status(204).send();
        } catch (error: unknown) {
            console.error("Erro ao revogar sessão administrativa:", error);
            return response.status(500).json({ message: "Erro interno ao encerrar sessão" });
        }
    };

    session = async (_request: Request, response: Response): Promise<Response> => {
        const principal = authenticatedPrincipal(response);
        return response.status(200).json({ name: principal.name });
    };

    clients = async (_request: Request, response: Response): Promise<Response> => {
        try {
            return response.status(200).json({ clients: await this.listClients.execute() });
        } catch (error: unknown) {
            console.error("Erro ao listar clientes:", error);
            return response.status(500).json({ message: "Erro interno ao listar clientes" });
        }
    };

    client = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
            return response.status(200).json({ client: await this.listClients.executeOne(id) });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao buscar cliente:", error);
            return response.status(500).json({ message: "Erro interno ao buscar cliente" });
        }
    };

    removeClient = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            await this.deleteClient.execute(id, request.body?.confirmationName);
            return response.status(204).send();
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            console.error("Erro ao remover cliente:", error);
            return response.status(500).json({ message: "Erro interno ao remover cliente" });
        }
    };

    updateClientProjectStage = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const result = await this.projectStages.execute(id, request.body?.stageKey, request.body?.status);
            return response.status(200).json(result);
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            if (error instanceof mongoose.Error.ValidationError) {
                return response.status(400).json({ message: "Etapa ou status inválido" });
            }
            console.error("Erro ao atualizar etapa do cliente:", error);
            return response.status(500).json({ message: "Erro interno ao atualizar etapa do cliente" });
        }
    };

    updateClientProjectStageOrder = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const result = await this.projectStages.updateOrder(id, request.body?.stageKeys);
            return response.status(200).json(result);
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            if (error instanceof mongoose.Error.ValidationError) {
                return response.status(400).json({ message: "Ordem das etapas inválida" });
            }
            console.error("Erro ao atualizar ordem das etapas do cliente:", error);
            return response.status(500).json({ message: "Erro interno ao atualizar ordem das etapas do cliente" });
        }
    };

    briefingReportStatus = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
            return response.status(200).json(await this.briefingReports.status(id));
        } catch (error: unknown) {
            return this.reportError(error, response);
        }
    };

    generateBriefingReport = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
            return response.status(201).json(await this.briefingReports.generate(id));
        } catch (error: unknown) {
            return this.reportError(error, response);
        }
    };

    clientProposals = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            return response.status(200).json({ proposals: await this.proposals.list(id) });
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    createClientProposal = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const result = await this.proposals.create(id, request.body, request.files as Express.Multer.File[] | undefined);
            return response.status(201).json(result);
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    editClientProposal = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const proposalId = this.routeParameter(request.params.proposalId);
            const proposal = await this.proposals.edit(id, proposalId, request.body, request.files as Express.Multer.File[] | undefined);
            return response.status(200).json({ proposal });
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    resendClientProposal = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const proposalId = this.routeParameter(request.params.proposalId);
            const result = await this.proposals.resend(id, proposalId);
            return response.status(200).json(result);
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    deleteClientProposal = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const proposalId = this.routeParameter(request.params.proposalId);
            await this.proposals.remove(id, proposalId);
            return response.status(204).send();
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    deleteClientProposalAttachment = async (request: Request, response: Response): Promise<Response> => {
        try {
            const id = this.routeParameter(request.params.id);
            const proposalId = this.routeParameter(request.params.proposalId);
            const attachmentIndex = this.routeParameter(request.params.attachmentIndex);
            const proposal = await this.proposals.removeAttachment(id, proposalId, attachmentIndex);
            return response.status(200).json({ proposal });
        } catch (error: unknown) {
            return this.proposalError(error, response);
        }
    };

    clientPayments = async (request: Request, response: Response): Promise<Response> => {
        try {
            const clientId = this.routeParameter(request.params.id);
            return response.status(200).json({ payments: await this.payments.list(clientId) });
        } catch (error: unknown) {
            return this.paymentError(error, response);
        }
    };

    createClientPayment = async (request: Request, response: Response): Promise<Response> => {
        try {
            const clientId = this.routeParameter(request.params.id);
            const principal = authenticatedPrincipal(response);
            return response.status(201).json({ payment: await this.payments.create(clientId, request.body, {
                id: principal.subject,
                sessionId: principal.sessionId,
                role: "admin"
            }) });
        } catch (error: unknown) {
            return this.paymentError(error, response);
        }
    };

    editClientPayment = async (request: Request, response: Response): Promise<Response> => {
        try {
            const clientId = this.routeParameter(request.params.id);
            const paymentId = this.routeParameter(request.params.paymentId);
            const principal = authenticatedPrincipal(response);
            return response.status(200).json({ payment: await this.payments.edit(clientId, paymentId, request.body, {
                id: principal.subject,
                sessionId: principal.sessionId,
                role: "admin"
            }) });
        } catch (error: unknown) {
            return this.paymentError(error, response);
        }
    };

    setDownPaymentPaid = async (request: Request, response: Response): Promise<Response> => {
        try {
            const clientId = this.routeParameter(request.params.id);
            const paymentId = this.routeParameter(request.params.paymentId);
            const principal = authenticatedPrincipal(response);
            return response.status(200).json({
                payment: await this.payments.setDownPaymentPaid(
                    clientId,
                    paymentId,
                    request.body?.isPaid,
                    request.body?.version,
                    { id: principal.subject, sessionId: principal.sessionId, role: "admin" }
                )
            });
        } catch (error: unknown) {
            return this.paymentError(error, response);
        }
    };

    setInstallmentPaid = async (request: Request, response: Response): Promise<Response> => {
        try {
            const clientId = this.routeParameter(request.params.id);
            const paymentId = this.routeParameter(request.params.paymentId);
            const installmentNumber = this.routeParameter(request.params.installmentNumber);
            const principal = authenticatedPrincipal(response);
            return response.status(200).json({
                payment: await this.payments.setInstallmentPaid(
                    clientId,
                    paymentId,
                    installmentNumber,
                    request.body?.isPaid,
                    request.body?.version,
                    { id: principal.subject, sessionId: principal.sessionId, role: "admin" }
                )
            });
        } catch (error: unknown) {
            return this.paymentError(error, response);
        }
    };

    create = async (request: Request, response: Response): Promise<Response> => {
        try {
            const command = this.parseCreateCommand(request.body);
            const created = await this.createClient.execute(command);
            return response.status(201).json({
                message: "Cliente criado com sucesso",
                client: {
                    id: created._id,
                    login: created.login,
                    name: created.name,
                    hasFilledBriefing: created.hasFilledBriefing,
                    briefing: created.briefing
                }
            });
        } catch (error: unknown) {
            if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
            if (error instanceof mongoose.Error.ValidationError) {
                return response.status(400).json({ message: "Dados do cliente ou briefing inválidos" });
            }
            console.error("Erro ao criar cliente:", error);
            return response.status(500).json({ message: "Erro interno ao criar cliente" });
        }
    };

    private parseCreateCommand(body: Record<string, unknown>): CreateClientCommand {
        const client = body.client as CreateClientCommand["client"] | undefined;
        if (!client) throw new ApplicationError("Os dados do cliente são obrigatórios", 400);
        if (!client.login || !client.password || !client.name || !client.briefing) {
            throw new ApplicationError("Login, senha, nome e briefing do cliente são obrigatórios", 400);
        }
        return { client };
    }

    private routeParameter(value: string | string[]): string {
        return Array.isArray(value) ? value[0] : value;
    }

    private proposalError(error: unknown, response: Response): Response {
        if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
        if (error instanceof mongoose.Error.ValidationError) {
            return response.status(400).json({ message: "Dados da proposta inválidos" });
        }
        console.error("Erro ao processar proposta:", error);
        return response.status(500).json({ message: "Erro interno ao processar proposta" });
    }

    private paymentError(error: unknown, response: Response): Response {
        if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
        if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
            return response.status(400).json({ message: "Dados do pagamento inválidos" });
        }
        console.error("Erro ao processar pagamento:", error instanceof Error ? error.name : "UnknownError");
        return response.status(500).json({ message: "Erro interno ao processar pagamento" });
    }

    private reportError(error: unknown, response: Response): Response {
        if (error instanceof ApplicationError) return response.status(error.status).json({ message: error.message });
        console.error("Erro ao processar relatório do briefing:", error);
        return response.status(500).json({ message: "Erro interno ao processar relatório do briefing" });
    }
}
