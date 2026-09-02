import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { BriefingFolderAccessService } from "../application/briefing-folder-access.service.js";
import clientBriefings from "../models/clientBriefing.js";
import clients from "../models/client.js";
import { GoogleDriveAttachmentStorage } from "../services/attachment-storage.js";
import { extractResidentEmails, maskedEmail } from "../services/briefing-emails.js";

const applyChanges = process.argv.slice(2).includes("--apply");
const unknownArguments = process.argv.slice(2).filter(argument => argument !== "--apply");

if (unknownArguments.length > 0) {
    throw new Error(`Argumentos desconhecidos: ${unknownArguments.join(", ")}`);
}

const environmentCandidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend", ".env")
];
const environmentPath = environmentCandidates.find(candidate => fs.existsSync(candidate));
if (!environmentPath) throw new Error("Arquivo .env do backend não encontrado");

const environmentResult = dotenv.config({ path: environmentPath, override: true });
if (environmentResult.error) throw environmentResult.error;

const databaseUri = process.env.DB_CONNECTION_STRING?.trim();
if (!databaseUri) throw new Error("DB_CONNECTION_STRING não está configurada");

interface MigrationSummary {
    briefingsFound: number;
    clientsNotFound: number;
    clientsWithoutFolder: number;
    foldersRecovered: number;
    briefingsWithoutEmails: number;
    emailsFound: number;
    permissionsCreated: number;
    permissionsExisting: number;
    permissionsFailed: number;
}

async function run(): Promise<void> {
    await mongoose.connect(databaseUri!, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });

    const briefings = await clientBriefings
        .find({}, { clientId: 1, responses: 1 })
        .lean();
    const clientIds = briefings.map(briefing => briefing.clientId);
    const clientRecords = await clients
        .find({ _id: { $in: clientIds } }, { _id: 1, login: 1, driveFolderId: 1 })
        .lean();
    const clientsById = new Map(clientRecords.map(client => [String(client._id), client]));
    const driveStorage = new GoogleDriveAttachmentStorage();
    const access = new BriefingFolderAccessService(driveStorage);
    const summary: MigrationSummary = {
        briefingsFound: briefings.length,
        clientsNotFound: 0,
        clientsWithoutFolder: 0,
        foldersRecovered: 0,
        briefingsWithoutEmails: 0,
        emailsFound: 0,
        permissionsCreated: 0,
        permissionsExisting: 0,
        permissionsFailed: 0
    };

    for (const briefing of briefings) {
        const emails = extractResidentEmails(briefing.responses);
        if (emails.length === 0) {
            summary.briefingsWithoutEmails += 1;
            continue;
        }
        summary.emailsFound += emails.length;

        const client = clientsById.get(String(briefing.clientId));
        if (!client) {
            summary.clientsNotFound += 1;
            summary.permissionsFailed += emails.length;
            continue;
        }

        let folderId = client.driveFolderId?.trim();
        if (!folderId) {
            summary.clientsWithoutFolder += 1;
            if (!applyChanges) continue;

            try {
                folderId = await driveStorage.createClientFolder(client.login);
                await clients.updateOne(
                    { _id: client._id },
                    { $set: { driveFolderId: folderId } }
                );
                summary.foldersRecovered += 1;
            } catch (error: unknown) {
                summary.permissionsFailed += emails.length;
                console.error(
                    `Cliente ${briefing.clientId}: não foi possível localizar/criar a pasta —`,
                    error instanceof Error ? error.message : error
                );
                continue;
            }
        }

        if (!applyChanges) continue;

        const result = await access.execute(folderId, briefing.responses);
        summary.permissionsCreated += result.permissionsCreated;
        summary.permissionsExisting += result.permissionsExisting;
        summary.permissionsFailed += result.failures.length;
        result.failures.forEach(failure => {
            console.error(
                `Cliente ${briefing.clientId}: falha para ${maskedEmail(failure.email)} — ${failure.message}`
            );
        });
    }

    console.log(applyChanges ? "Migração aplicada." : "Prévia concluída; nenhuma permissão foi alterada.");
    console.table(summary);
    if (!applyChanges && summary.emailsFound > 0) {
        console.log("Execute novamente com --apply para criar as permissões ausentes.");
    }
    if (applyChanges && summary.permissionsFailed > 0) process.exitCode = 1;
}

try {
    await run();
} finally {
    await mongoose.disconnect();
}
