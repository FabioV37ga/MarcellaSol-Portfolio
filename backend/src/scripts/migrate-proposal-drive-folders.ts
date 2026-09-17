import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import proposals from "../models/clientProposal.js";
import { GoogleDriveProposalStorage } from "../services/proposal-drive.storage.js";

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

async function run(): Promise<void> {
    await mongoose.connect(databaseUri!, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    const records = await proposals.find(
        { attachmentFolderId: { $exists: true, $ne: "" } },
        { title: 1, attachments: 1, attachment: 1, attachmentFolderId: 1 }
    ).lean();
    const storage = new GoogleDriveProposalStorage();
    let filesFound = 0;
    let filesMoved = 0;
    let failures = 0;

    for (const proposal of records) {
        const attachments = proposal.attachments?.length
            ? proposal.attachments
            : proposal.attachment ? [proposal.attachment] : [];
        filesFound += attachments.length;
        if (!applyChanges || attachments.length === 0 || !proposal.attachmentFolderId) continue;
        try {
            filesMoved += await storage.moveProposalAttachmentsToAdministratorFolder(
                proposal.attachmentFolderId,
                attachments
            );
        } catch (error) {
            failures += 1;
            console.error(
                `Proposta ${proposal._id} (${proposal.title}):`,
                error instanceof Error ? error.message : error
            );
        }
    }

    console.log(applyChanges ? "Migração aplicada." : "Prévia concluída; nenhum arquivo foi movido.");
    console.table({ proposalsFound: records.length, filesFound, filesMoved, failures });
    if (!applyChanges && records.length > 0) {
        console.log("Execute novamente com --apply para organizar os anexos existentes.");
    }
    if (applyChanges && failures > 0) process.exitCode = 1;
}

try {
    await run();
} finally {
    await mongoose.disconnect();
}
