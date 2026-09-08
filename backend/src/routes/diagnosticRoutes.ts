import express from "express";
import mongoose from "mongoose";

export type DatabaseReadiness = () => boolean;

export function createDiagnosticRoutes(
    databaseReady: DatabaseReadiness = () => mongoose.connection.readyState === 1
) {
    const router = express.Router();

    // Liveness: não consulta dependências. Indica apenas que o processo responde.
    router.get("/api/health", (_request, response) => {
        response.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Readiness: informa se a aplicação está apta a atender operações com persistência.
    router.get("/api/ready", (_request, response) => {
        const ready = databaseReady();
        response.status(ready ? 200 : 503).json({
            status: ready ? "ready" : "not-ready",
            dependencies: { mongodb: ready ? "ready" : "unavailable" },
            timestamp: new Date().toISOString()
        });
    });

    return router;
}

export default createDiagnosticRoutes();
