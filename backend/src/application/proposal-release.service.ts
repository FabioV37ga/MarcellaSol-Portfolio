import type { Clock } from "./ports/clock.js";
import type { IdGenerator } from "./ports/id-generator.js";
import type { FolderReadAccessStorage } from "../services/folder-permission.storage.js";
import type { ProposalStorage } from "../services/proposal-drive.storage.js";

interface ClaimedProposal {
    _id: { toString(): string };
    userId: { toString(): string };
    attachmentFolderId?: string;
    release?: {
        recipients: string[];
        notifiedRecipients?: string[];
        attempts: number;
        claimId?: string;
    };
}

export interface ProposalReleaseRepository {
    claimNextDueRelease(now: Date, claimId: string, claimExpiresAt: Date): PromiseLike<ClaimedProposal | null>;
    markReleaseCompleted(id: string, claimId: string, releasedAt: Date): PromiseLike<unknown>;
    markReleaseFailed(id: string, claimId: string, nextAttemptAt: Date, final: boolean, failureCode: string): PromiseLike<unknown>;
    markReleaseRecipientNotified(id: string, claimId: string, email: string): PromiseLike<unknown>;
    claimReleaseById(id: string, userId: string, now: Date, claimId: string, claimExpiresAt: Date): PromiseLike<ClaimedProposal | null>;
}

interface ClientFolderReader {
    findById(id: string): PromiseLike<{ driveFolderId?: string } | null>;
}

const retryDelays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const;
const leaseDuration = 10 * 60_000;

export class ProposalReleaseService {
    constructor(
        private readonly proposals: ProposalReleaseRepository,
        private readonly clients: ClientFolderReader,
        private readonly permissions: FolderReadAccessStorage,
        private readonly storage: Pick<ProposalStorage, "moveScheduledProposalToClient">,
        private readonly clock: Clock,
        private readonly ids: IdGenerator
    ) { }

    async processNext(): Promise<boolean> {
        const now = this.clock.now();
        const claimId = this.ids.generate();
        const proposal = await this.proposals.claimNextDueRelease(
            now,
            claimId,
            new Date(now.getTime() + leaseDuration)
        );
        if (!proposal) return false;

        await this.processClaimed(proposal, claimId, false);
        return true;
    }

    async releaseNow(proposalId: string, userId: string): Promise<void> {
        const now = this.clock.now();
        const claimId = this.ids.generate();
        const proposal = await this.proposals.claimReleaseById(
            proposalId,
            userId,
            now,
            claimId,
            new Date(now.getTime() + leaseDuration)
        );
        if (!proposal) throw new Error("PROPOSAL_RELEASE_NOT_AVAILABLE");
        await this.processClaimed(proposal, claimId, true);
    }

    private async processClaimed(proposal: ClaimedProposal, claimId: string, rethrow: boolean): Promise<void> {
        const proposalId = proposal._id.toString();
        try {
            if (!proposal.attachmentFolderId) throw new Error("PROPOSAL_FOLDER_MISSING");
            const client = await this.clients.findById(proposal.userId.toString());
            if (!client?.driveFolderId) throw new Error("CLIENT_FOLDER_MISSING");
            const recipients = proposal.release?.recipients ?? [];
            if (recipients.length === 0) throw new Error("PROPOSAL_RECIPIENTS_MISSING");
            const notified = new Set(proposal.release?.notifiedRecipients ?? []);

            for (const email of recipients) {
                if (notified.has(email)) continue;
                const permission = await this.permissions.grantFolderReadAccess(proposal.attachmentFolderId, email);
                if (!permission.created) throw new Error("PROPOSAL_PRIVATE_FOLDER_ACCESS_CONFLICT");
                await this.proposals.markReleaseRecipientNotified(proposalId, claimId, email);
                notified.add(email);
            }
            await this.storage.moveScheduledProposalToClient(proposal.attachmentFolderId, client.driveFolderId);
            await this.proposals.markReleaseCompleted(proposalId, claimId, this.clock.now());
        } catch (error) {
            const attempts = proposal.release?.attempts ?? 1;
            const delay = retryDelays[attempts - 1];
            const final = delay === undefined;
            const nextAttemptAt = new Date(this.clock.now().getTime() + (delay ?? 0));
            await this.proposals.markReleaseFailed(
                proposalId,
                claimId,
                nextAttemptAt,
                final,
                releaseFailureCode(error)
            );
            if (rethrow) throw error;
        }
    }
}

function releaseFailureCode(error: unknown): string {
    if (error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)) return error.message;
    return "DRIVE_RELEASE_FAILED";
}
