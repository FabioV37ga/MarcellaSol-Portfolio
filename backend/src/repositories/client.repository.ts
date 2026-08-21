import clients from "../models/client.js";
import type { BriefingObject } from "../models/briefing.js";
import type mongoose from "mongoose";

export interface CreateClientData {
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    briefing: BriefingObject;
}

export class ClientRepository {
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
        return clients.updateOne({ _id: id }, { $set: { hasFilledBriefing: true } });
    }

    updatePassword(id: mongoose.Types.ObjectId, password: string) {
        return clients.updateOne({ _id: id }, { $set: { password } });
    }
}
