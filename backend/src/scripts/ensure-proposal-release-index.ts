import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import proposals from "../models/clientProposal.js";

const INDEX_NAME = "proposal_release_due";
const applyChanges = process.argv.slice(2).includes("--apply");
const unknownArguments = process.argv.slice(2).filter(argument => argument !== "--apply");
if (unknownArguments.length) throw new Error(`Argumentos desconhecidos: ${unknownArguments.join(", ")}`);

const environmentPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "backend", ".env")]
    .find(candidate => fs.existsSync(candidate));
if (!environmentPath) throw new Error("Arquivo .env do backend não encontrado");
const environmentResult = dotenv.config({ path: environmentPath, override: true });
if (environmentResult.error) throw environmentResult.error;
const databaseUri = process.env.DB_CONNECTION_STRING?.trim();
if (!databaseUri) throw new Error("DB_CONNECTION_STRING não está configurada");

try {
    await mongoose.connect(databaseUri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
        socketTimeoutMS: 45_000
    });
    const indexes = await proposals.collection.indexes();
    const exists = indexes.some(index => index.name === INDEX_NAME);
    console.log(JSON.stringify({ mode: applyChanges ? "apply" : "preview", index: INDEX_NAME, exists }, null, 2));
    if (applyChanges && !exists) {
        await proposals.collection.createIndex({
            "release.status": 1,
            "release.nextAttemptAt": 1,
            "release.scheduledAt": 1,
            "release.attempts": 1
        }, {
            name: INDEX_NAME,
            partialFilterExpression: { "release.scheduledAt": { $exists: true } }
        });
        console.log(`Índice ${INDEX_NAME} criado.`);
    }
} finally {
    await mongoose.disconnect();
}
