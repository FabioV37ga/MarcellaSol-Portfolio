# MongoDB no deploy

O backend exige MongoDB com suporte a transações porque alterações financeiras e exclusões coordenadas usam sessões transacionais. Em instalação própria, configure o MongoDB como **replica set**, mesmo quando houver apenas um nó. MongoDB standalone não é uma topologia suportada pela aplicação.

## Verificação antes de publicar

Com o `DB_CONNECTION_STRING` do ambiente carregado, execute:

```bash
cd backend
npm run mongodb:smoke-transactions
```

O comando verifica a topologia, abre uma transação, realiza uma escrita temporária e aborta a transação. Em seguida confirma que o registro não foi persistido. Ele não lê nem modifica pagamentos ou clientes.

Depois de reiniciar o backend, valide:

```bash
curl --fail https://marcellasol.com.br/api/ready
```

O endpoint somente retorna HTTP 200 quando o MongoDB está conectado e oferece suporte a transações. MongoDB conectado como standalone retorna HTTP 503 com `transactions: unavailable`.

## Responsabilidade operacional

- O responsável pela infraestrutura deve manter o replica set saudável e monitorado.
- Backups precisam incluir o banco usado por `DB_CONNECTION_STRING` e ser testados por restauração periódica.
- O smoke test deve fazer parte de toda implantação que altere servidor, URI, provedor ou topologia do MongoDB.
- Não substitua `DB_CONNECTION_STRING` pela variável de testes `TEST_DB_CONNECTION_STRING` no ambiente de produção.
