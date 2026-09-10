import mongoose from "mongoose";
import { ClientBriefingRepository } from "../repositories/client-briefing.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import {
    GoogleDriveAttachmentStorage,
    type BriefingReportStorage
} from "../services/attachment-storage.js";
import type { BriefingReportDriveStatus } from "../services/googleDrive.js";
import { ApplicationError } from "./errors/application-error.js";
import { ReportJobRepository } from "../repositories/report-job.repository.js";
import type { ReportJobStatus } from "../models/reportJob.js";

export class ClientBriefingReportService {
    constructor(
        private readonly clients = new ClientRepository(),
        private readonly briefings = new ClientBriefingRepository(),
        private readonly storage: BriefingReportStorage = new GoogleDriveAttachmentStorage(),
        private readonly jobs = new ReportJobRepository()
    ) {}

    async status(clientId: string): Promise<BriefingReportDriveStatus & { job?: ReportJobResponse }> {
        const client = await this.getClient(clientId);
        const [driveStatus, job] = await Promise.all([
            this.storage.getBriefingReportStatus(client.driveFolderId),
            this.jobs.findLatestByClientId(client._id)
        ]);
        return { ...driveStatus, ...(job ? { job: reportJobResponse(job) } : {}) };
    }

    async generate(clientId: string): Promise<{ exists: false; job: ReportJobResponse }> {
        const client = await this.getClient(clientId);
        const briefing = await this.briefings.findReportSourceByClientId(client._id);
        if (!briefing) throw new ApplicationError("O cliente ainda não possui um briefing preenchido", 409);
        const briefingVersion = briefing.updatedAt ?? briefing.submittedAt;
        let job = await this.jobs.enqueue(client._id, briefingVersion);
        if (job.status === "succeeded" || job.status === "failed") {
            job = await this.jobs.requeueTerminal(job._id.toString()) ?? job;
        }
        return { exists: false, job: reportJobResponse(job) };
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

interface ReportJobResponse {
    id: string;
    status: ReportJobStatus;
    attempts: number;
    error?: string;
}

function reportJobResponse(job: { _id: unknown; status: ReportJobStatus; attempts: number; error?: string }): ReportJobResponse {
    return {
        id: String(job._id),
        status: job.status,
        attempts: job.attempts,
        ...(job.error ? { error: job.error } : {})
    };
}
