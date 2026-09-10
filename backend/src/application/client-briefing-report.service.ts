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
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const MAX_REPORT_IMAGES = 20;
sharp.cache(false);
sharp.concurrency(1);

export class ClientBriefingReportService {
    private static generationQueue: Promise<void> = Promise.resolve();
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
            await this.preparePrivateImages(reportDocument as unknown as Record<string, unknown>, temporaryDirectory);
            const pdf = await generateBriefingReportPdf(reportDocument, { temporaryDirectory });
            return this.storage.uploadBriefingReport(client.driveFolderId, client.name, pdf);
        } finally {
            await fs.rm(temporaryDirectory, { recursive: true, force: true });
        }
    }

    private async preparePrivateImages(document: Record<string, unknown>, temporaryDirectory: string): Promise<void> {
        const driveFiles: Record<string, unknown>[] = [];
        const seenFileIds = new Set<string>();
        const visit = (value: unknown): void => {
            if (driveFiles.length >= MAX_REPORT_IMAGES) return;
            if (Array.isArray(value)) {
                value.forEach(visit);
                return;
            }
            if (!value || typeof value !== "object") return;
            const record = value as Record<string, unknown>;
            const driveFile = record.driveFile;
            if (driveFile && typeof driveFile === "object") {
                const file = driveFile as Record<string, unknown>;
                const mimeType = typeof file.mimeType === "string" ? file.mimeType : "";
                const id = typeof file.id === "string" ? file.id : "";
                if (id && mimeType.startsWith("image/") && !seenFileIds.has(id)) {
                    seenFileIds.add(id);
                    driveFiles.push(file);
                }
            }
            Object.values(record).forEach(visit);
        };
        visit(document);

        for (const [index, driveFile] of driveFiles.entries()) {
            const fileId = driveFile.id as string;
            try {
                const image = await this.storage.downloadReportImage(fileId);
                const outputPath = path.join(temporaryDirectory, `image-${index + 1}.jpg`);
                await sharp(image.data, { limitInputPixels: 40_000_000 })
                    .rotate()
                    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
                    .flatten({ background: "#ffffff" })
                    .jpeg({ quality: 78, mozjpeg: true })
                    .toFile(outputPath);
                driveFile.localImageUrl = pathToFileURL(outputPath).href;
            } catch (error) {
                console.warn(`Não foi possível incorporar a imagem ${fileId} no relatório:`, error);
            }
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
