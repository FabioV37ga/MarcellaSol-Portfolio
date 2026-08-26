import mongoose from "mongoose";
import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import {
    GoogleDriveAttachmentStorage,
    type BriefingReportStorage
} from "../services/attachment-storage.js";
import {
    generateBriefingReportPdf,
    type BriefingReportDocument
} from "../services/briefing-report.js";
import type { BriefingReportDriveStatus } from "../services/googleDrive.js";
import { ApplicationError } from "./errors/application-error.js";

export class ClientBriefingReportService {
    private readonly generations = new Map<string, Promise<BriefingReportDriveStatus>>();

    constructor(
        private readonly clients = new ClientRepository(),
        private readonly briefings = new ClientBriefingRepository(),
        private readonly storage: BriefingReportStorage = new GoogleDriveAttachmentStorage()
    ) {}

    async status(clientId: string): Promise<BriefingReportDriveStatus> {
        const client = await this.getClient(clientId);
        return this.storage.getBriefingReportStatus(client.driveFolderId);
    }

    generate(clientId: string): Promise<BriefingReportDriveStatus> {
        const running = this.generations.get(clientId);
        if (running) return running;

        const generation = this.generateAndUpload(clientId).finally(() => {
            this.generations.delete(clientId);
        });
        this.generations.set(clientId, generation);
        return generation;
    }

    private async generateAndUpload(clientId: string): Promise<BriefingReportDriveStatus> {
        const client = await this.getClient(clientId);
        const briefing = await this.briefings.findReportSourceByClientId(client._id);
        if (!briefing) throw new ApplicationError("O cliente ainda não possui um briefing preenchido", 409);

        const pdf = await generateBriefingReportPdf(briefing as unknown as BriefingReportDocument);
        return this.storage.uploadBriefingReport(client.driveFolderId, client.name, pdf);
    }

    private async getClient(clientId: string) {
        if (!mongoose.isValidObjectId(clientId)) throw new ApplicationError("Cliente não encontrado", 404);
        const client = await this.clients.findById(clientId);
        if (!client) throw new ApplicationError("Cliente não encontrado", 404);
        if (!client.driveFolderId) {
            throw new ApplicationError("O cliente não possui uma pasta raiz no Google Drive", 409);
        }
        return {
            _id: client._id,
            name: client.name,
            driveFolderId: client.driveFolderId
        };
    }
}
