import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import payments from "../models/clientPayment.js";

const RETENTION_DAYS = 30;
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

const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
async function run(): Promise<void> {
    await mongoose.connect(databaseUri!, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 45000 });
    const [downPayments, installments] = await Promise.all([
        payments.countDocuments({
            $or: [
                { "downPayment.pix.analysisWindowEndsAt": { $lte: cutoff } },
                { "downPayment.pix.analysisWindowEndsAt": { $exists: false }, "downPayment.pix.expiresAt": { $lte: cutoff } }
            ]
        }),
        payments.aggregate<{ count: number }>([
            { $unwind: "$installments" },
            {
                $match: {
                    "installments.pix": { $exists: true }, $or: [
                        { "installments.pix.analysisWindowEndsAt": { $lte: cutoff } },
                        { "installments.pix.analysisWindowEndsAt": { $exists: false }, "installments.pix.expiresAt": { $lte: cutoff } }
                    ]
                }
            },
            { $count: "count" }
        ]).then(result => result[0]?.count ?? 0)
    ]);

    console.log(JSON.stringify({
        mode: applyChanges ? "apply" : "preview", retentionDays: RETENTION_DAYS,
        cutoff: cutoff.toISOString(), expiredDownPaymentAttempts: downPayments, expiredInstallmentAttempts: installments
    }, null, 2));
    if (!applyChanges || downPayments + installments === 0) return;

    const [downResult, installmentResult] = await Promise.all([
        payments.updateMany({
            $or: [
                { "downPayment.pix.analysisWindowEndsAt": { $lte: cutoff } },
                { "downPayment.pix.analysisWindowEndsAt": { $exists: false }, "downPayment.pix.expiresAt": { $lte: cutoff } }
            ]
        }, { $unset: { "downPayment.pix": 1 } }),
        payments.updateMany({ "installments.pix": { $exists: true } },
            { $unset: { "installments.$[expired].pix": 1 } },
            {
                arrayFilters: [{
                    $or: [
                        { "expired.pix.analysisWindowEndsAt": { $lte: cutoff } },
                        { "expired.pix.analysisWindowEndsAt": { $exists: false }, "expired.pix.expiresAt": { $lte: cutoff } }
                    ]
                }]
            })
    ]);
    console.log(JSON.stringify({ modifiedDocuments: downResult.modifiedCount + installmentResult.modifiedCount }, null, 2));
}

try {
    await run();
} finally {
    await mongoose.disconnect();
}
