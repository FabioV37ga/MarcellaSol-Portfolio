import type { Request, Response } from "express";
import type { ClientPaymentService } from "../application/client-payment.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class AdminPaymentsController {
    constructor(private readonly payments: Pick<ClientPaymentService,
        "list" | "preview" | "create" | "edit" | "remove" | "setDownPaymentPaid" | "setInstallmentPaid"
    >) { }

    clientPayments = async (request: Request, response: Response): Promise<Response> => {
        const clientId = this.routeParameter(request.params.id);
        return response.status(200).json(await this.payments.list(clientId, request.query.cursor, request.query.limit));
    };

    previewClientPayment = async (request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ preview: this.payments.preview(request.body) });
    };

    createClientPayment = async (request: Request, response: Response): Promise<Response> => {
        const clientId = this.routeParameter(request.params.id);
        const principal = authenticatedPrincipal(response);
        return response.status(201).json({
            payment: await this.payments.create(clientId, request.body, {
                id: principal.subject,
                sessionId: principal.sessionId,
                role: "admin"
            })
        });
    };

    editClientPayment = async (request: Request, response: Response): Promise<Response> => {
        const clientId = this.routeParameter(request.params.id);
        const paymentId = this.routeParameter(request.params.paymentId);
        const principal = authenticatedPrincipal(response);
        return response.status(200).json({
            payment: await this.payments.edit(clientId, paymentId, request.body, {
                id: principal.subject,
                sessionId: principal.sessionId,
                role: "admin"
            })
        });
    };

    removeClientPayment = async (request: Request, response: Response): Promise<Response> => {
        const clientId = this.routeParameter(request.params.id);
        const paymentId = this.routeParameter(request.params.paymentId);
        const principal = authenticatedPrincipal(response);
        await this.payments.remove(
            clientId,
            paymentId,
            request.body?.version,
            request.body?.confirmedReceiptHistoryAcknowledged,
            { id: principal.subject, sessionId: principal.sessionId, role: "admin" }
        );
        return response.status(204).send();
    };

    setDownPaymentPaid = async (request: Request, response: Response): Promise<Response> => {
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
    };

    setInstallmentPaid = async (request: Request, response: Response): Promise<Response> => {
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
    };

    private routeParameter(value: string | string[]): string {
        return Array.isArray(value) ? value[0] : value;
    }
}
