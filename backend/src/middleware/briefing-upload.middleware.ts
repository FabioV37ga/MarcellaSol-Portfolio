import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const allowedExtensions = new Set([
    ".pdf", ".doc", ".docx", ".odt", ".txt", ".rtf",
    ".xls", ".xlsx", ".csv", ".ppt", ".pptx"
]);
const allowedMimeTypes = new Set([
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text", "text/plain", "application/rtf", "text/rtf",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_request, file, callback) => {
        const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
        const accepted = file.mimetype.startsWith("image/")
            || allowedMimeTypes.has(file.mimetype)
            || allowedExtensions.has(extension);
        if (accepted) callback(null, true);
        else callback(new Error(`Formato de arquivo não permitido: ${file.originalname}`));
    },
    limits: { fileSize: 100 * 1024 * 1024, files: 50 }
});

export function receiveBriefingFiles(request: Request, response: Response, next: NextFunction): void {
    upload.array("files", 50)(request, response, error => {
        if (!error) return next();

        const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Cada anexo pode ter no máximo 100 MB"
            : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
                ? "O briefing pode conter no máximo 50 anexos"
                : error instanceof Error ? error.message : "Não foi possível receber os anexos";
        response.status(400).json({ message });
    });
}
