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

O comando conecta ao banco configurado em `backend/.env`, compara por `permission + viewName` e não altera dados.

## Aplicar alterações

```bash
npm run views:sync
```

A sincronização cria views ausentes e atualiza `view`, `type`, `permission` e `viewName` das existentes. Ela nunca remove registros. O `_id` do arquivo é usado apenas ao criar uma view; atualizações preservam o `_id` existente no banco.

Somente arquivos terminados em `-view.json` são considerados. Outros documentos e scripts deste diretório são ignorados.
