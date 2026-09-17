import mongoose from "mongoose";
import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import type {
    BriefingReportDriveStatus,
    BriefingReportStorage
} from "../services/briefing-report-drive.storage.js";
import type { BriefingReportDocument } from "../services/briefing-report.mapper.js";
import type { ReportImageResolver } from "../services/briefing-report-image-resolver.js";
import type { PdfRenderer } from "../services/briefing-report-pdf.renderer.js";
import { buildBriefingReportHtml } from "../services/briefing-report.template.js";
import { ApplicationError } from "./errors/application-error.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export class ClientBriefingReportService {
    private static generationQueue: Promise<void> = Promise.resolve();
    private readonly generations = new Map<string, Promise<BriefingReportDriveStatus>>();

    constructor(
        private readonly clients: ClientRepository,
        private readonly briefings: ClientBriefingRepository,
        private readonly storage: BriefingReportStorage,
        private readonly images: ReportImageResolver,
        private readonly renderer: PdfRenderer
    ) { }

    async status(clientId: string): Promise<BriefingReportDriveStatus> {
        const client = await this.getClient(clientId);
        return this.storage.getBriefingReportStatus(client.driveFolderId);
    }

    generate(clientId: string): Promise<BriefingReportDriveStatus> {
        const running = this.generations.get(clientId);
        if (running) return running;

        const generation = ClientBriefingReportService.generationQueue
            .then(() => this.generateAndUpload(clientId));
        ClientBriefingReportService.generationQueue = generation.then(() => undefined, () => undefined);
        const trackedGeneration = generation.finally(() => {
            this.generations.delete(clientId);
        });
        this.generations.set(clientId, trackedGeneration);
        return trackedGeneration;
    }

    private async generateAndUpload(clientId: string): Promise<BriefingReportDriveStatus> {
        const client = await this.getClient(clientId);
        const briefing = await this.briefings.findReportSourceByClientId(client._id);
        if (!briefing) throw new ApplicationError("O cliente ainda não possui um briefing preenchido", 409);

        const reportDocument = briefing as unknown as BriefingReportDocument;
        const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "briefing-report-"));
        try {
            await this.images.prepare(reportDocument as unknown as Record<string, unknown>, temporaryDirectory);
            const html = buildBriefingReportHtml(reportDocument, { temporaryDirectory });
            const pdf = await this.renderer.render(html, { temporaryDirectory });
            return this.storage.uploadBriefingReport(client.driveFolderId, client.name, pdf);
        } finally {
            await fs.rm(temporaryDirectory, { recursive: true, force: true });
        }
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
