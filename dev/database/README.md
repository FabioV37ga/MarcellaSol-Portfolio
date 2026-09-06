# Arquivos de banco para desenvolvimento

Os arquivos `*-view.json` deste diretório são a fonte local das views armazenadas na coleção `views` do MongoDB.

## Validar os arquivos sem acessar o banco

```bash
npm run views:validate
```

## Conferir diferenças

```bash
npm run views:check
```

O comando conecta ao banco configurado em `backend/.env`, compara por `permission + viewName`, mostra checksums para conteúdos divergentes, detecta views extras e confere o índice único. Ele não altera dados.

## Aplicar alterações

```bash
npm run views:sync
```

A sincronização cria views ausentes, atualiza `view`, `type`, `permission` e `viewName` das existentes e garante o índice único case-insensitive de `(permission, viewName)`. Ela nunca remove registros. O `_id` do arquivo é usado apenas ao criar uma view; atualizações preservam o `_id` existente no banco.

Somente arquivos terminados em `-view.json` são considerados. Outros documentos e scripts deste diretório são ignorados.

O validador exige o inventário completo de views conhecidas, a combinação correta de `permission`, `viewName` e `type`, um único elemento HTML raiz e HTML sem erros estruturais reportados pelo parser.

## Migrações operacionais

Os arquivos `*.mongodb.js` são scripts manuais e idempotentes. Eles não são executados por `views:sync`.

- `auth-sessions-indexes.mongodb.js`: índices de revogação e expiração de sessões.
- `financial-security-migration.mongodb.js`: prepara cobranças antigas para versionamento, auditoria e arquivamento.
