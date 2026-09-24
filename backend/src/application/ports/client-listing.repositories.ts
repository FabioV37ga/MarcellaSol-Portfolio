import type mongoose from "mongoose";
import type { ProjectStage, ProjectStageKey } from "../../models/projectStage.js";
import type { ClientPageOptions } from "../pagination/client-list-pagination.js";

export interface AdminClientListRecord {
    _id: mongoose.Types.ObjectId;
    name: string;
    hasFilledBriefing: boolean;
    currentStageKey?: ProjectStageKey;
    projectStages?: ProjectStage[];
}

export interface AdminClientDetailsRecord extends AdminClientListRecord {
    driveFolderId?: string;
}

export interface AdminBriefingListRecord {
    clientId: mongoose.Types.ObjectId;
    briefingDefinition: Record<string, unknown>;
}

export interface ClientListingRepository {
    findPageForAdmin(options: ClientPageOptions): PromiseLike<{
        records: AdminClientListRecord[];
        hasMore: boolean;
    }>;
    findByIdForAdmin(id: string): PromiseLike<AdminClientDetailsRecord | null>;
}

export interface BriefingListingRepository {
    findByClientIds(clientIds: mongoose.Types.ObjectId[]): PromiseLike<AdminBriefingListRecord[]>;
    findByClientIdForAdmin(clientId: mongoose.Types.ObjectId): PromiseLike<AdminBriefingListRecord | null>;
}
