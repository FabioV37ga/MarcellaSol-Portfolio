import type { ProposalReleaseService } from "../application/proposal-release.service.js";

export class ProposalReleaseScheduler {
    private timer?: NodeJS.Timeout;
    private running = false;

    constructor(
        private readonly releases: Pick<ProposalReleaseService, "processNext">,
        private readonly intervalMilliseconds = 30_000,
        private readonly batchSize = 10
    ) { }

    start(): void {
        if (this.timer) return;
        void this.tick();
        this.timer = setInterval(() => { void this.tick(); }, this.intervalMilliseconds);
        this.timer.unref();
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = undefined;
    }

    private async tick(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            for (let index = 0; index < this.batchSize; index += 1) {
                if (!await this.releases.processNext()) break;
            }
        } catch (error) {
            console.error("Falha ao processar liberações agendadas de propostas:", error instanceof Error ? error.message : error);
        } finally {
            this.running = false;
        }
    }
}
