// Migração idempotente da coleção financeira existente.
// Execute manualmente no banco desejado antes ou junto ao deploy.
// Não remove cobranças nem altera valores ou estados de pagamento.

db.financeiro.updateMany(
  { __v: { $exists: false } },
  { $set: { __v: 0 } }
);

db.financeiro.updateMany(
  { events: { $exists: false } },
  { $set: { events: [] } }
);

db.financeiro.createIndex(
  { clientId: 1, archivedAt: 1, createdAt: -1 },
  { name: "clientId_archivedAt_createdAt" }
);
