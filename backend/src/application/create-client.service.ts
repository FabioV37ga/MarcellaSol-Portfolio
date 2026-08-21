import type { BriefingObject } from "../models/briefing.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { PasswordService } from "../services/password.service.js";
import { ApplicationError } from "./errors/application-error.js";

export interface CreateClientCommand {
    client: {
        login: string;
        password: string;
        name: string;
        hasFilledBriefing?: boolean;
        briefing: BriefingObject;
    };
}

export class CreateClientService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly passwords = new PasswordService()
    ) {}

    async execute(command: CreateClientCommand) {
        if (await this.clients.existsByLogin(command.client.login)) {
            throw new ApplicationError("Já existe um cliente com este login", 409);
        }

        return this.clients.create({
            login: command.client.login,
            password: await this.passwords.hash(command.client.password),
            name: command.client.name,
            hasFilledBriefing: command.client.hasFilledBriefing ?? false,
            briefing: command.client.briefing
        });
    }
}
