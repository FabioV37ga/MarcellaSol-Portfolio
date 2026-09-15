import type { Request, Response } from "express";
import type { ClientPaymentService } from "../application/client-payment.service.js";
import { authenticatedPrincipal } from "../middleware/authentication.middleware.js";

export class ClientPaymentsController {
    constructor(private readonly paymentService: Pick<ClientPaymentService, "listForClient" | "generatePix">) { }

    payments = async (request: Request, response: Response): Promise<Response> => {
        const principal = authenticatedPrincipal(response);
        return response.status(200).json(await this.paymentService.listForClient(
            principal.subject, request.query.cursor, request.query.limit
        ));
    };

    generatePaymentPix = async (request: Request, response: Response): Promise<Response> => {
        const principal = authenticatedPrincipal(response);
        const result = await this.paymentService.generatePix(
            principal.subject,
            String(request.params.paymentId ?? ""),
            request.body?.partType,
            request.body?.installmentNumber,
            { id: principal.subject, sessionId: principal.sessionId, role: "client" }
        );
        return response.status(200).json(result);
    };
}
