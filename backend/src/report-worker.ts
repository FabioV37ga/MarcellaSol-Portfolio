import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import connect from "./config/dbConnect.js";
import { BriefingReportWorker } from "./application/briefing-report.worker.js";

const environmentPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "backend", ".env")]
    .find(candidate => fs.existsSync(candidate));
if (environmentPath) {
    const result = dotenv.config({ path: environmentPath, override: false, quiet: true });
    if (result.error) throw result.error;
}
const databaseUri = process.env.DB_CONNECTION_STRING?.trim();
if (!databaseUri) throw new Error("DB_CONNECTION_STRING não está configurada");

const worker = new BriefingReportWorker();
let shuttingDown = false;
const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("! Encerramento do worker solicitado; aguardando o job atual");
    worker.stop();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
    await connect(databaseUri);
    await worker.run();
} catch (error) {
    console.error("✗ Worker de relatórios encerrado com erro:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
