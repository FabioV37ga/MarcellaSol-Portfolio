import express from "express";
import { currentMongoDbReadiness, type MongoDbCapabilities } from "../config/mongodb-capabilities.js";

export type DatabaseReadiness = () => boolean | MongoDbCapabilities;

export function createDiagnosticRoutes(
    databaseReady: DatabaseReadiness = currentMongoDbReadiness
) {
    const router = express.Router();

    // Liveness: não consulta dependências. Indica apenas que o processo responde.
    router.get("/api/health", (_request, response) => {
        response.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Readiness: informa se a aplicação está apta a atender operações com persistência.
    router.get("/api/ready", (_request, response) => {
        const state = databaseReady();
        const connected = typeof state === "boolean" ? state : state.connected;
        const transactions = typeof state === "boolean" ? state : state.transactions;
        const ready = connected && transactions;
        response.status(ready ? 200 : 503).json({
            status: ready ? "ready" : "not-ready",
            dependencies: {
                mongodb: connected ? "ready" : "unavailable",
                transactions: transactions ? "ready" : "unavailable"
            },
            timestamp: new Date().toISOString()
        });
    });

    return router;
}

export default createDiagnosticRoutes();
