import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import connect from "./config/dbConnect.js";
import routes from "./routes/index.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(process.cwd(), "backend/.env")
});

console.log("CWD:", process.cwd());
console.log("MONGO_URI RAW:", JSON.stringify(process.env.DB_CONNECTION_STRING));

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS
const corsOptions = {
  origin: [
    'http://localhost:8080',
    // 'https://marcellasol.com.br',
    'https://marcellasol.com.br:8080',
    // 'https://www.marcellasol.com.br',
    'https://www.marcellasol.com.br:8080',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Conectar ao MongoDB
connect();

// Rota de health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    mongodb: mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
    timestamp: new Date().toISOString(),
  });
});

// Configurar rotas
routes(app);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor rodando na porta ${PORT}`);
  console.log(`✓ Conectado ao MongoDB`);
});
