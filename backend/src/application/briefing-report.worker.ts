import { randomUUID } from "node:crypto";
import { ApplicationError } from "./errors/application-error.js";
import { BriefingReportProcessor } from "./briefing-report-processor.js";
import { ReportJobRepository } from "../repositories/report-job.repository.js";

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
type WorkerLogger = Pick<Console, "log" | "error">;

export class BriefingReportWorker {
    private stopping = false;

    constructor(
        private readonly jobs = new ReportJobRepository(),
        private readonly processor = new BriefingReportProcessor(),
        private readonly workerId = `report-worker-${randomUUID()}`,
        private readonly pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
        private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS,
        private readonly logger: WorkerLogger = console
    ) {}

    stop(): void {
        this.stopping = true;
    }

    async run(): Promise<void> {
        const staleBefore = new Date(Date.now() - this.staleAfterMs);
        const recovery = await this.jobs.recoverInterrupted(staleBefore);
        if (recovery.modifiedCount > 0) this.logger.log(`✓ ${recovery.modifiedCount} job(s) de relatório recuperado(s)`);
        this.logger.log(`✓ Worker de relatórios iniciado (${this.workerId}, concorrência 1)`);

        while (!this.stopping) {
            const processed = await this.processNext();
            if (!processed && !this.stopping) await delay(this.pollIntervalMs);
        }
    }

    async processNext(): Promise<boolean> {
        const job = await this.jobs.claimNext(this.workerId);
        if (!job) return false;
        const jobId = job._id.toString();
        try {
            await this.processor.process(job.clientId.toString());
            await this.jobs.succeed(jobId);
        } catch (error) {
            await this.jobs.fail(jobId, sanitizedJobError(error));
            this.logger.error(`✗ Job de relatório ${jobId} falhou:`, error instanceof Error ? error.name : "UnknownError");
        }
        return true;
    }
}

function sanitizedJobError(error: unknown): string {
    if (error instanceof ApplicationError) return error.message;
    return "Não foi possível gerar o relatório";
}

function delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
