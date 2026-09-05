import express from "express";
import cors from "cors";
import type { Server } from "node:http";
import type { ApplicationConfig } from "./config/application-config.js";
import connect from "./config/dbConnect.js";
import { AdminController } from "./controllers/admin.controller.js";
import { ClientController } from "./controllers/client.controller.js";
import { ClientPaymentService } from "./application/client-payment.service.js";
import { securityHeaders } from "./middleware/security-headers.middleware.js";
import routes from "./routes/index.js";

export async function startServer(config: ApplicationConfig): Promise<Server> {
    const app = express();

    if (config.trustProxyHops > 0) app.set("trust proxy", config.trustProxyHops);
    app.disable("x-powered-by");
    app.use(...securityHeaders(config.isProduction));
    app.use(cors({
        origin: config.isProduction ? productionOrigins : [...productionOrigins, ...developmentOrigins],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));

    app.get("/", (_request, response) => response.send("Backend rodando, check"));
    app.get("/api", (_request, response) => response.send("Backend rodando, check"));

    await connect(config.databaseUri);

    const payments = new ClientPaymentService(config.pixReceiver);
    routes(app, {
        admin: new AdminController(payments),
        client: new ClientController(payments)
    });

    return app.listen(config.port, () => {
        console.log(`✓ Servidor rodando na porta ${config.port}`);
    });
}

const productionOrigins = [
    "https://marcellasol.com.br",
    "https://www.marcellasol.com.br"
];

const developmentOrigins = [
    "http://localhost:3000",
    "http://localhost:8080",
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/
];
