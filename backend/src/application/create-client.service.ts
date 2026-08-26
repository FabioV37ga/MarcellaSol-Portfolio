import type { BriefingObject } from "../models/briefing.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { PasswordService } from "../services/password.service.js";
import { ApplicationError } from "./errors/application-error.js";
import { GoogleDriveAttachmentStorage, type ClientFolderStorage } from "../services/attachment-storage.js";

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
        private readonly passwords = new PasswordService(),
        private readonly folders: ClientFolderStorage = new GoogleDriveAttachmentStorage()
    ) {}

    async execute(command: CreateClientCommand) {
        if (await this.clients.existsByLogin(command.client.login)) {
            throw new ApplicationError("Já existe um cliente com este login", 409);
        }

        const password = await this.passwords.hash(command.client.password);
        const driveFolderId = await this.folders.createClientFolder(command.client.login);

        return this.clients.create({
            login: command.client.login,
            password,
            name: command.client.name,
            hasFilledBriefing: command.client.hasFilledBriefing ?? false,
            driveFolderId,
            briefing: command.client.briefing
        });
    }
}
