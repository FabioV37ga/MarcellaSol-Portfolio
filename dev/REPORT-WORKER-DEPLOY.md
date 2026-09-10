# Worker de relatórios na VPS

A API apenas persiste solicitações na coleção `report-jobs`. A geração do PDF e o envio ao Drive são executados pelo processo `report-worker`, com concorrência máxima de um relatório por processo.

## Primeira ativação no PM2

Depois de instalar dependências e executar o build, entre na raiz real do projeto na VPS e rode:

```bash
pm2 start dist/src/report-worker.js --name marcellasol-report-worker --cwd /caminho/real/MarcellaSol-Portfolio/backend
pm2 save
```

Substitua `/caminho/real/MarcellaSol-Portfolio` pelo caminho absoluto do projeto. O diretório `backend` deve conter o `.env` usado pelo backend.

Nos deploys seguintes, o comando já existente `pm2 restart all` também reiniciará o worker salvo.

## Verificação

```bash
pm2 status
pm2 logs marcellasol-report-worker --lines 50
```

O log esperado na inicialização contém `Worker de relatórios iniciado` e `concorrência 1`.

Ao receber `SIGTERM` ou `SIGINT`, o worker deixa de buscar novos jobs, termina o relatório atual e só então fecha a conexão com o MongoDB. Jobs que permanecerem em `running` após uma interrupção abrupta são recolocados na fila na próxima inicialização quando tiverem mais de 15 minutos.

Não execute duas instâncias desse worker na VPS básica. A reivindicação dos jobs é atômica, mas duas instâncias permitiriam duas execuções de Chromium simultâneas e aumentariam bastante o consumo de memória.
