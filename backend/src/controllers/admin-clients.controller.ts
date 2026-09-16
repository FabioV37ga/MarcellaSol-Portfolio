import type { Request, Response } from "express";
import { ApplicationError } from "../application/errors/application-error.js";
import type { CreateClientCommand, CreateClientService } from "../application/create-client.service.js";
import type { DeleteClientService } from "../application/delete-client.service.js";
import type { ListClientsService } from "../application/list-clients.service.js";
import type { UpdateClientProjectStageService } from "../application/update-client-project-stage.service.js";

export class AdminClientsController {
    constructor(
        private readonly createClient: Pick<CreateClientService, "execute">,
        private readonly listClients: Pick<ListClientsService, "execute" | "executeOne">,
        private readonly projectStages: Pick<UpdateClientProjectStageService, "execute" | "updateOrder">,
        private readonly deleteClient: Pick<DeleteClientService, "execute">
    ) { }

    clients = async (_request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ clients: await this.listClients.execute() });
    };

    client = async (request: Request, response: Response): Promise<Response> => {
        return response.status(200).json({ client: await this.listClients.executeOne(this.routeParameter(request.params.id)) });
    };

    removeClient = async (request: Request, response: Response): Promise<Response> => {
        await this.deleteClient.execute(this.routeParameter(request.params.id), request.body?.confirmationName);
        return response.status(204).send();
    };

    updateClientProjectStage = async (request: Request, response: Response): Promise<Response> => {
        const result = await this.projectStages.execute(
            this.routeParameter(request.params.id), request.body?.stageKey, request.body?.status
        );
        return response.status(200).json(result);
    };

    updateClientProjectStageOrder = async (request: Request, response: Response): Promise<Response> => {
        const result = await this.projectStages.updateOrder(
            this.routeParameter(request.params.id), request.body?.stageKeys
        );
        return response.status(200).json(result);
    };

    create = async (request: Request, response: Response): Promise<Response> => {
        const created = await this.createClient.execute(this.parseCreateCommand(request.body));
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
}
