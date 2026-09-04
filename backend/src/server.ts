import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "path";
import connect from "./config/dbConnect.js";
import routes from "./routes/index.js";
import { securityHeaders } from "./middleware/security-headers.middleware.js";


const environmentCandidates = [
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(process.cwd(), ".env")
];
const environmentPath = environmentCandidates.find(candidate => fs.existsSync(candidate));

if (!environmentPath) {
  throw new Error(`Arquivo .env não encontrado. Caminhos verificados: ${environmentCandidates.join(", ")}`);
}

const environmentResult = dotenv.config({
  path: environmentPath,
  override: true
});

if (environmentResult.error) throw environmentResult.error;
if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.trim().length < 32) {
  throw new Error("AUTH_TOKEN_SECRET deve ser configurado no .env com pelo menos 32 caracteres");
}
console.log(`✓ Variáveis de ambiente carregadas de ${environmentPath}`);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);

if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
  throw new Error("TRUST_PROXY_HOPS deve ser um número inteiro entre 0 e 10");
}
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);

app.disable("x-powered-by");
app.use(...securityHeaders(isProduction));

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

const corsOptions = {
  origin: isProduction ? productionOrigins : [...productionOrigins, ...developmentOrigins],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Rota simples para verificar se backend está rodando
app.get('/', (req, res) => {
  res.send('Backend rodando, check');
});

app.get('/api', (req, res) => {
  res.send('Backend rodando, check');
});

// Conectar ao MongoDB
connect();

// Configurar rotas
routes(app);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor rodando na porta ${PORT}`);
  console.log(`✓ Conectado ao MongoDB`);
});
