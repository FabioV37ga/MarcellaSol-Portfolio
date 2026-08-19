import express, { type NextFunction, Request, Response } from "express";
import multer from "multer";
import clients from "../models/client.js";
import clientBriefings from "../models/clientBriefing.js";
import { uploadBriefingFiles, type DriveUpload } from "../services/googleDrive.js";

const router = express.Router();
const allowedDocumentExtensions = new Set([
  ".pdf", ".doc", ".docx", ".odt", ".txt", ".rtf",
  ".xls", ".xlsx", ".csv", ".ppt", ".pptx"
]);
const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
  "application/rtf",
  "text/rtf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);
const briefingUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const accepted = file.mimetype.startsWith("image/")
      || allowedDocumentMimeTypes.has(file.mimetype)
      || allowedDocumentExtensions.has(extension);

    if (accepted) {
      callback(null, true);
      return;
    }

    callback(new Error(`Formato de arquivo não permitido: ${file.originalname}`));
  },
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 50
  }
});

function receiveBriefingFiles(req: Request, res: Response, next: NextFunction): void {
  briefingUpload.array("files", 50)(req, res, error => {
    if (!error) {
      next();
      return;
    }

    const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "Cada anexo pode ter no máximo 100 MB"
      : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
        ? "O briefing pode conter no máximo 50 anexos"
        : error instanceof Error
          ? error.message
          : "Não foi possível receber os anexos";
    res.status(400).json({ message });
  });
}

interface FileManifestEntry {
  uploadId: string;
  pageKey: string;
  answerKey: string;
  fileIndex: number;
  originalName: string;
}

interface StoredAttachment extends FileManifestEntry, DriveUpload {}

function parseBriefingRequest(req: Request): Record<string, unknown> {
  if (typeof req.body?.payload !== "string") return req.body ?? {};

  try {
    const payload: unknown = JSON.parse(req.body.payload);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("payload não é um objeto");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new Error("Payload multipart inválido");
  }
}

function addDriveDataToResponses(value: unknown, attachments: StoredAttachment[]): unknown {
  const attachmentsByUploadId = new Map(attachments.map(item => [item.uploadId, item]));

  const visit = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(visit);
    if (!current || typeof current !== "object") return current;

    const record = current as Record<string, unknown>;
    const attachment = typeof record.uploadId === "string"
      ? attachmentsByUploadId.get(record.uploadId)
      : undefined;
    const next = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]));

    return attachment
      ? { ...next, driveFile: { id: attachment.id, name: attachment.name, mimeType: attachment.mimeType, size: attachment.size, webViewLink: attachment.webViewLink } }
      : next;
  };

  return visit(value);
}

router.post("/api/client/briefing", receiveBriefingFiles, async (req: Request, res: Response) => {
    try {
      const body = parseBriefingRequest(req);
      const { login, password, briefing, fileManifest } = body;

      if (typeof login !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      if (!briefing || typeof briefing !== "object" || Array.isArray(briefing)) {
        return res.status(400).json({ message: "Briefing inválido" });
      }

      const client = await clients.findOne({ login, password });
      if (!client) {
        return res.status(401).json({ message: "Acesso negado. Login ou senha incorretos." });
      }

      const files = (req.files ?? []) as Express.Multer.File[];
      const manifest = Array.isArray(fileManifest) ? fileManifest as FileManifestEntry[] : [];
      if (files.length !== manifest.length) {
        return res.status(400).json({ message: "A lista de anexos não corresponde aos arquivos enviados" });
      }

      const invalidManifest = manifest.some(item =>
        !item || typeof item.uploadId !== "string" || typeof item.pageKey !== "string"
        || typeof item.answerKey !== "string" || typeof item.fileIndex !== "number"
        || typeof item.originalName !== "string"
      );
      if (invalidManifest) {
        return res.status(400).json({ message: "Metadados dos anexos inválidos" });
      }

      const driveResult = await uploadBriefingFiles(client.login, files);
      const attachments: StoredAttachment[] = driveResult.files.map((driveFile, index) => ({
        ...manifest[index],
        ...driveFile
      }));
      const responses = addDriveDataToResponses(briefing, attachments) as Record<string, unknown>;

      const clientData = client.toObject();
      const briefingDocument = {
        clientId: client._id,
        clientLogin: client.login,
        briefingDefinition: clientData.briefing,
        responses,
        driveFolderId: driveResult.folderId || undefined,
        attachments,
        submittedAt: new Date()
      };

      console.log(
        "Briefing recebido para persistência:",
        JSON.stringify(briefingDocument, null, 2)
      );

      const savedBriefing = await clientBriefings.findOneAndUpdate(
        { clientId: client._id },
        {
          $set: briefingDocument
        },
        { upsert: true, new: true, runValidators: true }
      );

      client.hasFilledBriefing = true;
      await client.save();

      return res.status(200).json({
        message: "Briefing enviado com sucesso",
        briefingId: savedBriefing._id,
        uploadedFiles: attachments.length
      });
    } catch (error: unknown) {
      console.error("Erro ao salvar briefing do cliente:", error);
      const message = error instanceof Error && error.message.startsWith("Integração com Google Drive não configurada")
        ? error.message
        : "Erro ao salvar briefing";
      return res.status(500).json({ message });
    }
});



// Rota de login de administrador
router.post("/api/client/login", async (req, res) => {
    try {
      const {login, password} = req.body;

      if (!login || !password) {
        return res.status(400).json({ message: "Login e senha são obrigatórios" });
      }

      const admin = await clients.findOne({login: login, password: password});
      
      // const test = await admins.find()
      // console.log(test)
      if (!admin) {
        console.log(login, password)
        return res.status(401).json({ message: "Login ou senha incorretos" });
      }

      res.status(200).json({
        message: "Login bem-sucedido",
        name: admin.name,
        hasFilledBriefing: admin.hasFilledBriefing,
        briefingObject: admin.briefing,
        clientObject: {
          id: admin._id,
          name: admin.name,
          hasFilledBriefing: admin.hasFilledBriefing
        }
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao buscar admin", error: error.message });
    }
  });

export default router;
