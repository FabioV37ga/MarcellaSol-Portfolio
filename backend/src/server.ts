// TODO: organizar código, separar em arquivos, etc

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { addSocketListeners } from "./listeners/index.listener";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3210",
            "http://192.168.15.1:3210",
            "http://192.168.15.2:3210",
            "https://impostor-3r7r.onrender.com"
        ]
    }
});

addSocketListeners(io)

server.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
});