import clients from "../models/client.js";
import type { BriefingObject } from "../models/briefing.js";
import type mongoose from "mongoose";
import type { ProjectStage, ProjectStageKey } from "../models/projectStage.js";
import type { ClientPageOptions } from "../application/pagination/client-list-pagination.js";

export interface CreateClientData {
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    driveFolderId: string;
    briefing: BriefingObject;
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

export class ClientRepository {
    async findPageForAdmin(options: ClientPageOptions) {
        const records = await clients
            .find(
                options.cursor ? { _id: { $lt: options.cursor.id } } : {},
                { _id: 1, name: 1, hasFilledBriefing: 1, currentStageKey: 1, projectStages: 1 }
            )
            .sort({ _id: -1 })
            .limit(options.limit + 1)
            .lean();
        return { records: records.slice(0, options.limit), hasMore: records.length > options.limit };
    }

    findByIdForAdmin(id: string) {
        return clients
            .findById(id, { _id: 1, name: 1, hasFilledBriefing: 1, driveFolderId: 1, currentStageKey: 1, projectStages: 1 })
            .lean();
    }

    findByLogin(login: string) {
        return clients.findOne({ login });
    }

    findById(id: string) {
        return clients.findById(id);
    }

    existsByLogin(login: string) {
        return clients.exists({ login });
    }

    create(data: CreateClientData) {
        return clients.create(data);
    }

    markBriefingFilled(id: mongoose.Types.ObjectId, projectStages: ProjectStage[]) {
        return clients.updateOne({ _id: id }, {
            $set: {
                hasFilledBriefing: true,
                currentStageKey: "briefing",
                projectStages
            }
        });
    }

    updatePassword(id: mongoose.Types.ObjectId, password: string) {
        return clients.updateOne({ _id: id }, { $set: { password } });
    }

    updateProjectStageState(
        id: string,
        currentStageKey: ProjectStageKey,
        projectStages: ProjectStage[]
    ) {
        return clients.findByIdAndUpdate(
            id,
            { $set: { currentStageKey, projectStages } },
            { returnDocument: "after", runValidators: true }
        ).select({ _id: 1 }).lean();
    }
}
