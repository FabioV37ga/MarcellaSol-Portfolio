import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import { findOrCreateDriveFolder } from "./drive-folder.js";
import { getGoogleDriveClient } from "./google-drive-client.js";

export interface BriefingReportDriveStatus {
    exists: boolean;
    folderUrl?: string;
}

export interface DriveImageDownload {
    data: Buffer;
    mimeType: string;
    size: number;
}

export interface BriefingReportStorage {
    getBriefingReportStatus(clientFolderId: string): Promise<BriefingReportDriveStatus>;
    uploadBriefingReport(clientFolderId: string, clientName: string, pdf: Buffer): Promise<BriefingReportDriveStatus>;
    downloadReportImage(fileId: string): Promise<DriveImageDownload>;
}

type DriveClientFactory = () => drive_v3.Drive;

function escapeDriveQuery(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFolder(
    drive: drive_v3.Drive,
    parentId: string,
    name: string
): Promise<string | undefined> {
    const folders = await drive.files.list({
        q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1
    });
    return folders.data.files?.[0]?.id ?? undefined;
}

async function findBriefingReport(drive: drive_v3.Drive, reportsFolderId: string) {
    const files = await drive.files.list({
        q: `'${escapeDriveQuery(reportsFolderId)}' in parents and name contains 'relatorio-briefing-' and mimeType = 'application/pdf' and trashed = false`,
        fields: "files(id,name)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 100
    });
    return files.data.files?.find(file => /^relatorio-briefing-.*\.pdf$/i.test(file.name ?? ""));
}

function reportFileName(clientName: string): string {
    const slug = clientName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `relatorio-briefing-${slug || "cliente"}.pdf`;
}

export class GoogleDriveBriefingReportStorage implements BriefingReportStorage {
    constructor(private readonly createClient: DriveClientFactory = getGoogleDriveClient) { }

    async getBriefingReportStatus(clientFolderId: string): Promise<BriefingReportDriveStatus> {
        const drive = this.createClient();
        const reportsFolderId = await findFolder(drive, clientFolderId, "relatorios");
        if (!reportsFolderId) return { exists: false };

        const report = await findBriefingReport(drive, reportsFolderId);
        return {
            exists: Boolean(report),
            folderUrl: report
                ? `https://drive.google.com/drive/folders/${encodeURIComponent(reportsFolderId)}`
                : undefined
        };
    }

    async uploadBriefingReport(
        clientFolderId: string,
        clientName: string,
        pdf: Buffer
    ): Promise<BriefingReportDriveStatus> {
        const drive = this.createClient();
        const reportsFolderId = await findOrCreateDriveFolder(drive, clientFolderId, "relatorios");
        const existing = await findBriefingReport(drive, reportsFolderId);
        const name = reportFileName(clientName);
        const media = { mimeType: "application/pdf", body: Readable.from(pdf) };

        if (existing?.id) {
            await drive.files.update({
                fileId: existing.id,
                requestBody: { name },
                media,
                fields: "id",
                supportsAllDrives: true
            });
        } else {
            await drive.files.create({
                requestBody: { name, parents: [reportsFolderId] },
                media,
                fields: "id",
                supportsAllDrives: true
            });
        }

        return {
            exists: true,
            folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(reportsFolderId)}`
        };
    }

    async downloadReportImage(fileId: string): Promise<DriveImageDownload> {
        const drive = this.createClient();
        const metadata = await drive.files.get({
            fileId,
            fields: "id,mimeType,size,capabilities(canDownload)",
            supportsAllDrives: true
        });
        const mimeType = metadata.data.mimeType ?? "";
        const size = Number(metadata.data.size) || 0;
        if (!mimeType.startsWith("image/")) throw new Error("O anexo não é uma imagem");
        if (metadata.data.capabilities?.canDownload === false) throw new Error("A imagem não permite download");
        if (size > 25 * 1024 * 1024) {
            throw new Error("A imagem excede o limite de 25 MB para relatórios");
        }

        const response = await drive.files.get(
            { fileId, alt: "media", supportsAllDrives: true },
            { responseType: "arraybuffer" }
        );
        return { data: Buffer.from(response.data as ArrayBuffer), mimeType, size };
    }
}
