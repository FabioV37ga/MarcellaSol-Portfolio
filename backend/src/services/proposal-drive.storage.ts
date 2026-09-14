import { Readable } from "node:stream";
import { createDriveClient, findOrCreateFolder, setDriveFolderTrashed } from "./googleDrive.js";

export interface ProposalDriveUpload {
    folderId: string;
    attachmentUrls: string[];
}

function safeFolderName(value: string): string {
    return value.normalize("NFKC").trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ") || "proposta-sem-titulo";
}

function proposalFolderName(title: string, proposalId: string): string {
    return `${safeFolderName(title)}-${proposalId}`;
}

export async function uploadProposalAttachment(
    clientFolderId: string,
    proposalId: string,
    title: string,
    files: Express.Multer.File[],
    author: "administrator" | "client" = "administrator",
    responseIndex?: number
): Promise<ProposalDriveUpload> {
    const drive = createDriveClient();
    const proposalsFolderId = await findOrCreateFolder(drive, clientFolderId, "propostas");
    const folderId = await findOrCreateFolder(drive, proposalsFolderId, proposalFolderName(title, proposalId));
    const authorFolderId = await findOrCreateFolder(
        drive,
        folderId,
        author === "administrator" ? "administrador" : "cliente"
    );
    const uploadFolderId = author === "client" && responseIndex
        ? await findOrCreateFolder(drive, authorFolderId, `resposta-${responseIndex}`)
        : authorFolderId;
    const attachmentUrls: string[] = [];
    for (const file of files) {
        const uploaded = await drive.files.create({
            requestBody: { name: file.originalname, parents: [uploadFolderId] },
            media: {
                mimeType: file.mimetype || "application/octet-stream",
                body: Readable.from(file.buffer)
            },
            fields: "id,webViewLink",
            supportsAllDrives: true
        });
        if (!uploaded.data.id) throw new Error(`O Google Drive não retornou o ID de ${file.originalname}`);
        attachmentUrls.push(uploaded.data.webViewLink
            || `https://drive.google.com/file/d/${encodeURIComponent(uploaded.data.id)}/view`);
    }
    return { folderId, attachmentUrls };
}

export async function moveProposalAttachmentsToAdministratorFolder(
    proposalFolderId: string,
    attachmentUrls: string[]
): Promise<number> {
    const drive = createDriveClient();
    const administratorFolderId = await findOrCreateFolder(drive, proposalFolderId, "administrador");
    let moved = 0;
    for (const attachmentUrl of attachmentUrls) {
        const fileId = proposalAttachmentFileId(attachmentUrl);
        const metadata = await drive.files.get({ fileId, fields: "id,parents", supportsAllDrives: true });
        const parents = metadata.data.parents ?? [];
        if (!parents.includes(proposalFolderId)) continue;
        await drive.files.update({
            fileId,
            addParents: administratorFolderId,
            removeParents: proposalFolderId,
            fields: "id,parents",
            supportsAllDrives: true
        });
        moved += 1;
    }
    return moved;
}

export async function renameProposalFolder(folderId: string, proposalId: string, title: string): Promise<void> {
    const drive = createDriveClient();
    await drive.files.update({
        fileId: folderId,
        requestBody: { name: proposalFolderName(title, proposalId) },
        fields: "id",
        supportsAllDrives: true
    });
}

export function setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
    return setDriveFolderTrashed(folderId, trashed);
}

export async function setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void> {
    const drive = createDriveClient();
    await drive.files.update({
        fileId: proposalAttachmentFileId(attachmentUrl),
        requestBody: { trashed },
        fields: "id,trashed",
        supportsAllDrives: true
    });
}

function proposalAttachmentFileId(attachmentUrl: string): string {
    let parsed: URL;
    try {
        parsed = new URL(attachmentUrl);
    } catch {
        throw new Error("URL do anexo do Google Drive inválida");
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com") {
        throw new Error("O anexo não pertence ao Google Drive");
    }
    const pathMatch = parsed.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
    const fileId = pathMatch?.[1] ?? parsed.searchParams.get("id");
    if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
        throw new Error("Não foi possível identificar o arquivo do anexo no Google Drive");
    }
    return fileId;
}
