import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const applyChanges = process.argv.slice(2).includes("--apply");
const unknownArguments = process.argv.slice(2).filter(argument => argument !== "--apply");
if (unknownArguments.length > 0) throw new Error(`Argumentos desconhecidos: ${unknownArguments.join(", ")}`);

const environmentPath = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend", ".env")
].find(candidate => fs.existsSync(candidate));
if (!environmentPath) throw new Error("Arquivo .env do backend não encontrado");
const environmentResult = dotenv.config({ path: environmentPath, override: true });
if (environmentResult.error) throw environmentResult.error;
const databaseUri = process.env.DB_CONNECTION_STRING?.trim();
if (!databaseUri) throw new Error("DB_CONNECTION_STRING não está configurada");

function adultAmount(value: unknown): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

async function run(): Promise<void> {
    await mongoose.connect(databaseUri!, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    if (!mongoose.connection.db) throw new Error("Conexão com o banco indisponível");

    const clients = mongoose.connection.db.collection("clients");
    const briefings = mongoose.connection.db.collection("client-briefings");
    const clientRecords = await clients.find(
        { "briefing.description.residentAmount": { $exists: true } },
        { projection: { "briefing.description.residentAmount": 1 } }
    ).toArray();
    const briefingRecords = await briefings.find({
        $or: [
            { "briefingDefinition.description.residentAmount": { $exists: true } },
            { "responses.project.residentAmount": { $exists: true } }
        ]
    }, {
        projection: {
            "briefingDefinition.description.residentAmount": 1,
            "responses.project.residentAmount": 1
        }
    }).toArray();

    let clientsUpdated = 0;
    let briefingsUpdated = 0;
    if (applyChanges) {
        for (const record of clientRecords) {
            await clients.updateOne({ _id: record._id }, {
                $set: {
                    "briefing.description.adultAmount": adultAmount(record.briefing?.description?.residentAmount),
                    "briefing.description.childrenAmount": 0
                },
                $unset: { "briefing.description.residentAmount": "" }
            });
            clientsUpdated += 1;
        }

        for (const record of briefingRecords) {
            const set: Record<string, number> = {};
            const unset: Record<string, string> = {};
            const definitionCount = record.briefingDefinition?.description?.residentAmount;
            const responseCount = record.responses?.project?.residentAmount;
            if (definitionCount !== undefined) {
                set["briefingDefinition.description.adultAmount"] = adultAmount(definitionCount);
                set["briefingDefinition.description.childrenAmount"] = 0;
                unset["briefingDefinition.description.residentAmount"] = "";
            }
            if (responseCount !== undefined) {
                set["responses.project.adultAmount"] = adultAmount(responseCount);
                set["responses.project.childrenAmount"] = 0;
                unset["responses.project.residentAmount"] = "";
            }
            await briefings.updateOne({ _id: record._id }, { $set: set, $unset: unset });
            briefingsUpdated += 1;
        }
    }

    console.log(applyChanges ? "Migração aplicada." : "Prévia concluída; nenhum documento foi alterado.");
    console.table({
        clientsFound: clientRecords.length,
        clientsUpdated,
        submittedBriefingsFound: briefingRecords.length,
        submittedBriefingsUpdated: briefingsUpdated
    });
    if (!applyChanges && (clientRecords.length > 0 || briefingRecords.length > 0)) {
        console.log("Execute novamente com --apply para substituir residentAmount por adultAmount e childrenAmount.");
    }
}

try {
    await run();
} finally {
    await mongoose.disconnect();
}
