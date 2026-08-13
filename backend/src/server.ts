import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connect from "./config/dbConnect.js";
import routes from "./routes/index.js";


dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const app = express();
const PORT = process.env.PORT || 3000;

// TODO: On-prod remover localhost e IPs privados da lista de origens permitidas no CORS
// Configuração de CORS
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://marcellasol.com.br:8080',
    'https://marcellasol.com.br',
    'https://www.marcellasol.com.br:8080',
    'https://www.marcellasol.com.br',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // IPs privados 192.168.x.x
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // IPs privados 10.x.x.x
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
