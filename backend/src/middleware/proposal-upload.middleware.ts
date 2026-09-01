import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024, files: 20 }
});

export function receiveProposalAttachment(request: Request, response: Response, next: NextFunction): void {
    upload.array("attachments", 20)(request, response, error => {
        if (!error) return next();
        const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Cada anexo pode ter no máximo 100 MB"
            : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
                ? "A proposta pode conter no máximo 20 anexos por envio"
            : error instanceof Error ? error.message : "Não foi possível receber o anexo";
        response.status(400).json({ message });
    });
}
