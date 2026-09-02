import clients from "../models/client.js";
import type { BriefingObject } from "../models/briefing.js";
import type mongoose from "mongoose";
import { initialProjectStages, type ProjectStage, type ProjectStageKey } from "../models/projectStage.js";

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
    findAllForAdmin() {
        return clients
            .find({}, { _id: 1, name: 1, hasFilledBriefing: 1 })
            .lean();
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

    markBriefingFilled(id: mongoose.Types.ObjectId) {
        return clients.updateOne({ _id: id }, {
            $set: {
                hasFilledBriefing: true,
                currentStageKey: "briefing",
                projectStages: initialProjectStages(true)
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
            { new: true, runValidators: true }
        ).select({ _id: 1 }).lean();
    }
}
