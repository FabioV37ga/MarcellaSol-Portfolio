// Índices da coleção operacional usada para revogação de sessões.
// O Mongoose cria os mesmos índices automaticamente. Execute este arquivo apenas
// quando o ambiente de produção desabilitar a criação automática de índices.
// Este script não cria, altera nem revoga documentos de sessão de usuários.

db.authSessions.createIndex(
  { sessionId: 1 },
  { unique: true, name: "sessionId_unique" }
);

db.authSessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "expiresAt_ttl" }
);

db.authSessions.createIndex(
  { subject: 1, role: 1, revokedAt: 1 },
  { name: "subject_role_revokedAt" }
);
