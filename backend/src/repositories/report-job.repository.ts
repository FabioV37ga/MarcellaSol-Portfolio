import mongoose from "mongoose";
import reportJobs from "../models/reportJob.js";

export class ReportJobRepository {
    enqueue(clientId: mongoose.Types.ObjectId, briefingVersion: Date) {
        return reportJobs.findOneAndUpdate(
            { clientId, briefingVersion },
            { $setOnInsert: { clientId, briefingVersion, status: "queued", attempts: 0 } },
            { upsert: true, new: true, runValidators: true }
        );
    }

    requeueTerminal(id: string) {
        return reportJobs.findOneAndUpdate(
            { _id: id, status: { $in: ["succeeded", "failed"] } },
            { $set: { status: "queued" }, $unset: { error: 1, workerId: 1, startedAt: 1, finishedAt: 1 } },
            { new: true, runValidators: true }
        );
    }

    findLatestByClientId(clientId: mongoose.Types.ObjectId) {
        return reportJobs.findOne({ clientId }).sort({ createdAt: -1 });
    }

    claimNext(workerId: string) {
        return reportJobs.findOneAndUpdate(
            { status: "queued" },
            { $set: { status: "running", workerId, startedAt: new Date() }, $inc: { attempts: 1 }, $unset: { error: 1, finishedAt: 1 } },
            { new: true, runValidators: true, sort: { createdAt: 1 } }
        );
    }

    recoverInterrupted(staleBefore: Date) {
        return reportJobs.updateMany(
            { status: "running", startedAt: { $lt: staleBefore } },
            { $set: { status: "queued" }, $unset: { workerId: 1, startedAt: 1 } }
        );
    }

    succeed(id: string) {
        return reportJobs.updateOne(
            { _id: id, status: "running" },
            { $set: { status: "succeeded", finishedAt: new Date() }, $unset: { error: 1, workerId: 1 } }
        );
    }

    fail(id: string, error: string) {
        return reportJobs.updateOne(
            { _id: id, status: "running" },
            { $set: { status: "failed", error: error.slice(0, 500), finishedAt: new Date() }, $unset: { workerId: 1 } }
        );
    }
}
