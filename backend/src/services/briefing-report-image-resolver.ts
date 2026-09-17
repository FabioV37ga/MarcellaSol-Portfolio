import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import type { DriveImageDownload } from "./briefing-report-drive.storage.js";

const MAX_REPORT_IMAGES = 20;

sharp.cache(false);
sharp.concurrency(1);

export interface BriefingReportImageStorage {
    downloadReportImage(fileId: string): Promise<DriveImageDownload>;
}

export interface ReportImageResolver {
    prepare(document: Record<string, unknown>, temporaryDirectory: string): Promise<void>;
}

type ImageProcessor = (image: Buffer, outputPath: string) => Promise<void>;
type WarningLogger = (message: string, error: unknown) => void;

async function processReportImage(image: Buffer, outputPath: string): Promise<void> {
    await sharp(image, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(outputPath);
}

export class BriefingReportImageResolver implements ReportImageResolver {
    constructor(
        private readonly storage: BriefingReportImageStorage,
        private readonly processImage: ImageProcessor = processReportImage,
        private readonly warn: WarningLogger = (message, error) => console.warn(message, error)
    ) { }

    async prepare(document: Record<string, unknown>, temporaryDirectory: string): Promise<void> {
        const driveFiles = this.collectDriveImages(document);
        for (const [index, driveFile] of driveFiles.entries()) {
            const fileId = driveFile.id as string;
            try {
                const image = await this.storage.downloadReportImage(fileId);
                const outputPath = path.join(temporaryDirectory, `image-${index + 1}.jpg`);
                await this.processImage(image.data, outputPath);
                driveFile.localImageUrl = pathToFileURL(outputPath).href;
            } catch (error) {
                this.warn(`Não foi possível incorporar a imagem ${fileId} no relatório:`, error);
            }
        }
    }

    private collectDriveImages(document: Record<string, unknown>): Record<string, unknown>[] {
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
        return driveFiles;
    }
}
