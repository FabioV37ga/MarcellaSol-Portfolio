import { Readable } from "node:stream";
import { drive, type drive_v3 } from "@googleapis/drive";
import { OAuth2Client } from "google-auth-library";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface DriveUpload {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    webViewLink?: string;
}

export interface DriveUploadResult {
    folderId: string;
    files: DriveUpload[];
}

export interface BriefingReportDriveStatus {
    exists: boolean;
    folderUrl?: string;
}

export interface ProposalDriveUpload {
    folderId: string;
    attachmentUrls: string[];
}

export interface DriveImageDownload {
    data: Buffer;
    mimeType: string;
    size: number;
}

export interface FolderReadAccessResult {
    email: string;
    permissionId?: string;
    created: boolean;
}

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Integração com Google Drive não configurada: ${name}`);
    return value;
}

function createDriveClient(): drive_v3.Drive {
    const auth = new OAuth2Client(
        requiredEnvironment("GOOGLE_OAUTH_CLIENT_ID"),
        requiredEnvironment("GOOGLE_OAUTH_CLIENT_SECRET"),
        process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
    );

    auth.setCredentials({
        refresh_token: requiredEnvironment("GOOGLE_OAUTH_REFRESH_TOKEN")
    });

    return drive({ version: "v3", auth });
}

function escapeDriveQuery(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeFolderName(value: string): string {
    const safeValue = value
        .normalize("NFKC")
        .trim()
        .replace(/[\\/?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ");

    return safeValue || "cliente-sem-login";
}

function proposalFolderName(title: string, proposalId: string): string {
    return `${safeFolderName(title)}-${proposalId}`;
}

async function findOrCreateFolder(
    drive: drive_v3.Drive,
    parentId: string,
    name: string
): Promise<string> {
    const escapedName = escapeDriveQuery(name);
    const folders = await drive.files.list({
        q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapedName}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
        fields: "files(id,name)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1
    });

    const existingId = folders.data.files?.[0]?.id;
    if (existingId) return existingId;

    const created = await drive.files.create({
        requestBody: {
            name,
            mimeType: FOLDER_MIME_TYPE,
            parents: [parentId]
        },
        fields: "id",
        supportsAllDrives: true
    });

    if (!created.data.id) throw new Error(`O Google Drive não retornou o ID da pasta ${name}`);
    return created.data.id;
}

async function findFolder(drive: drive_v3.Drive, parentId: string, name: string): Promise<string | undefined> {
    const folders = await drive.files.list({
        q: `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
        fields: "files(id)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1
    });
    return folders.data.files?.[0]?.id ?? undefined;
}

async function findBriefingReport(drive: drive_v3.Drive, reportsFolderId: string) {
    const files = await drive.files.list({
        q: `'${escapeDriveQuery(reportsFolderId)}' in parents and name contains 'relatorio-briefing-' and mimeType = 'application/pdf' and trashed = false`,
        fields: "files(id,name)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 100
    });
    return files.data.files?.find(file => /^relatorio-briefing-.*\.pdf$/i.test(file.name ?? ""));
}

function reportFileName(clientName: string): string {
    const slug = clientName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `relatorio-briefing-${slug || "cliente"}.pdf`;
}

async function findOrCreateClientFolder(drive: drive_v3.Drive, clientLogin: string): Promise<string> {
    const rootFolderId = requiredEnvironment("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    const clientsFolderId = await findOrCreateFolder(drive, rootFolderId, "clientes");
    return findOrCreateFolder(drive, clientsFolderId, safeFolderName(clientLogin));
}

export async function createClientDriveFolder(clientLogin: string): Promise<string> {
    return findOrCreateClientFolder(createDriveClient(), clientLogin);
}

export async function grantFolderReadAccess(
    folderId: string,
    email: string
): Promise<FolderReadAccessResult> {
    const drive = createDriveClient();
    let pageToken: string | undefined;

    do {
        const listed = await drive.permissions.list({
            fileId: folderId,
            fields: "nextPageToken,permissions(id,emailAddress,deleted)",
            supportsAllDrives: true,
            pageSize: 100,
            pageToken
        });
        const existing = listed.data.permissions?.find(permission =>
            !permission.deleted && permission.emailAddress?.trim().toLowerCase() === email
        );
        if (existing) {
            return { email, permissionId: existing.id ?? undefined, created: false };
        }
        pageToken = listed.data.nextPageToken ?? undefined;
    } while (pageToken);

    const created = await drive.permissions.create({
        fileId: folderId,
        requestBody: {
            type: "user",
            role: "reader",
            emailAddress: email
        },
        sendNotificationEmail: true,
        supportsAllDrives: true,
        fields: "id,emailAddress"
    });

    return { email, permissionId: created.data.id ?? undefined, created: true };
}

export async function getBriefingReportDriveStatus(clientFolderId: string): Promise<BriefingReportDriveStatus> {
    const drive = createDriveClient();
    const reportsFolderId = await findFolder(drive, clientFolderId, "relatorios");
    if (!reportsFolderId) return { exists: false };

    const report = await findBriefingReport(drive, reportsFolderId);
    return {
        exists: Boolean(report),
        folderUrl: report ? `https://drive.google.com/drive/folders/${encodeURIComponent(reportsFolderId)}` : undefined
    };
}

export async function uploadBriefingReportPdf(
    clientFolderId: string,
    clientName: string,
    pdf: Buffer
): Promise<BriefingReportDriveStatus> {
    const drive = createDriveClient();
    const reportsFolderId = await findOrCreateFolder(drive, clientFolderId, "relatorios");
    const existing = await findBriefingReport(drive, reportsFolderId);
    const name = reportFileName(clientName);
    const media = { mimeType: "application/pdf", body: Readable.from(pdf) };

    if (existing?.id) {
        await drive.files.update({
            fileId: existing.id,
            requestBody: { name },
            media,
            fields: "id",
            supportsAllDrives: true
        });
    } else {
        await drive.files.create({
            requestBody: { name, parents: [reportsFolderId] },
            media,
            fields: "id",
            supportsAllDrives: true
        });
    }

    return {
        exists: true,
        folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(reportsFolderId)}`
    };
}

export async function uploadBriefingFiles(
    clientLogin: string,
    files: Express.Multer.File[]
): Promise<DriveUploadResult> {
    if (files.length === 0) return { folderId: "", files: [] };

    const drive = createDriveClient();
    const clientFolderId = await findOrCreateClientFolder(drive, clientLogin);
    const briefingFolderId = await findOrCreateFolder(drive, clientFolderId, "documentos_briefing");
    const uploadedFiles: DriveUpload[] = [];

    for (const file of files) {
        const uploaded = await drive.files.create({
            requestBody: {
                name: file.originalname,
                parents: [briefingFolderId]
            },
            media: {
                mimeType: file.mimetype || "application/octet-stream",
                body: Readable.from(file.buffer)
            },
            fields: "id,name,mimeType,size,webViewLink",
            supportsAllDrives: true
        });

        if (!uploaded.data.id) throw new Error(`O Google Drive não retornou o ID de ${file.originalname}`);
        uploadedFiles.push({
            id: uploaded.data.id,
            name: uploaded.data.name || file.originalname,
            mimeType: uploaded.data.mimeType || file.mimetype,
            size: Number(uploaded.data.size) || file.size,
            webViewLink: uploaded.data.webViewLink || undefined
        });
    }

    return { folderId: briefingFolderId, files: uploadedFiles };
}

export async function uploadProposalAttachment(
    clientFolderId: string,
    proposalId: string,
    title: string,
    files: Express.Multer.File[]
): Promise<ProposalDriveUpload> {
    const drive = createDriveClient();
    const proposalsFolderId = await findOrCreateFolder(drive, clientFolderId, "propostas");
    const folderId = await findOrCreateFolder(drive, proposalsFolderId, proposalFolderName(title, proposalId));
    const attachmentUrls: string[] = [];
    for (const file of files) {
        const uploaded = await drive.files.create({
            requestBody: { name: file.originalname, parents: [folderId] },
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
    return {
        folderId,
        attachmentUrls
    };
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

export async function setDriveFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
    const drive = createDriveClient();
    await drive.files.update({
        fileId: folderId,
        requestBody: { trashed },
        fields: "id,trashed",
        supportsAllDrives: true
    });
}

export function setProposalFolderTrashed(folderId: string, trashed: boolean): Promise<void> {
    return setDriveFolderTrashed(folderId, trashed);
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

export async function setProposalAttachmentTrashed(attachmentUrl: string, trashed: boolean): Promise<void> {
    const drive = createDriveClient();
    await drive.files.update({
        fileId: proposalAttachmentFileId(attachmentUrl),
        requestBody: { trashed },
        fields: "id,trashed",
        supportsAllDrives: true
    });
}

export async function downloadDriveImage(fileId: string): Promise<DriveImageDownload> {
    const drive = createDriveClient();
    const metadata = await drive.files.get({
        fileId,
        fields: "id,mimeType,size,capabilities(canDownload)",
        supportsAllDrives: true
    });
    const mimeType = metadata.data.mimeType ?? "";
    const size = Number(metadata.data.size) || 0;
    if (!mimeType.startsWith("image/")) throw new Error("O anexo não é uma imagem");
    if (metadata.data.capabilities?.canDownload === false) throw new Error("A imagem não permite download");
    if (size > 25 * 1024 * 1024) throw new Error("A imagem excede o limite de 25 MB para relatórios");

    const response = await drive.files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "arraybuffer" }
    );
    return { data: Buffer.from(response.data as ArrayBuffer), mimeType, size };
}
