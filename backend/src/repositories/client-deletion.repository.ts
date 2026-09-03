import mongoose from "mongoose";
import clients from "../models/client.js";
import clientBriefings from "../models/clientBriefing.js";
import clientProposals from "../models/clientProposal.js";
import authSessions from "../models/authSession.js";

export class ClientDeletionRepository {
    async deleteByIdAndName(clientId: string, name: string): Promise<boolean> {
        const session = await mongoose.startSession();
        let deleted = false;

        try {
            await session.withTransaction(async () => {
                const clientResult = await clients.deleteOne({ _id: clientId, name }, { session });
                if (clientResult.deletedCount !== 1) return;

                await Promise.all([
                    clientBriefings.deleteMany({ clientId }, { session }),
                    clientProposals.deleteMany({ userId: clientId }, { session }),
                    authSessions.deleteMany({ subject: clientId, role: "client" }, { session })
                ]);
                deleted = true;
            });
            return deleted;
        } finally {
            await session.endSession();
        }
    }
}
