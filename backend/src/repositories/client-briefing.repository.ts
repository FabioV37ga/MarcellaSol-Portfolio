import type mongoose from "mongoose";
import clientBriefings, { type ClientBriefingDocument } from "../models/clientBriefing.js";

export class ClientBriefingRepository {
    findByClientIds(clientIds: mongoose.Types.ObjectId[]) {
        return clientBriefings
            .find(
                { clientId: { $in: clientIds } },
                { clientId: 1, briefingDefinition: 1 }
            )
            .lean();
    }

    saveForClient(clientId: mongoose.Types.ObjectId, document: Omit<ClientBriefingDocument, "clientId">) {
        return clientBriefings.findOneAndUpdate(
            { clientId },
            { $set: { ...document, clientId } },
            { upsert: true, new: true, runValidators: true }
        );
    }
}
