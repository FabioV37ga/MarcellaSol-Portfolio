import type mongoose from "mongoose";
import clientBriefings, { type ClientBriefingDocument } from "../models/clientBriefing.js";

export class ClientBriefingRepository {
    saveForClient(clientId: mongoose.Types.ObjectId, document: Omit<ClientBriefingDocument, "clientId">) {
        return clientBriefings.findOneAndUpdate(
            { clientId },
            { $set: { ...document, clientId } },
            { upsert: true, new: true, runValidators: true }
        );
    }
}
