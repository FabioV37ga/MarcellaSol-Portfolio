import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { detectMongoDbCapabilities } from "../config/mongodb-capabilities.js";

const environmentPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "backend", ".env")]
    .find(candidate => fs.existsSync(candidate));
if (environmentPath) {
    const result = dotenv.config({ path: environmentPath, override: false, quiet: true });
    if (result.error) throw result.error;
}
const databaseUri = process.env.DB_CONNECTION_STRING?.trim();
if (!databaseUri) throw new Error("DB_CONNECTION_STRING não está configurada");

try {
    await mongoose.connect(databaseUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    const capabilities = await detectMongoDbCapabilities(mongoose.connection);
    if (!capabilities.transactions || !mongoose.connection.db) {
        throw new Error("MongoDB não está em replica set nem conectado por mongos; transações indisponíveis");
    }

    const session = await mongoose.startSession();
    const smokeId = randomUUID();
    try {
        session.startTransaction();
        await mongoose.connection.db.collection("__transaction_smoke").insertOne(
            { smokeId, createdAt: new Date() },
            { session }
        );
        await session.abortTransaction();
        const persisted = await mongoose.connection.db.collection("__transaction_smoke").findOne({ smokeId });
        if (persisted) throw new Error("O registro abortado pelo smoke test foi persistido inesperadamente");
    } finally {
        if (session.inTransaction()) await session.abortTransaction();
        await session.endSession();
    }
    console.log("✓ Smoke test transacional concluído; a escrita abortada não foi persistida");
} finally {
    await mongoose.disconnect();
}
