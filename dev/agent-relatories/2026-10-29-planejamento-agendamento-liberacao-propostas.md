# Planejamento — agendamento da liberação de propostas

Data: 29/10/2026  
Estado: implementação concluída e validada localmente em 29/10/2026. Build, 117 testes de frontend, 142 testes de backend (1 integração Mongo ignorada) e 42 testes E2E aprovados. A prova real do e-mail nativo permanece pendente de ambiente e conta de homologação; o índice e a view ainda precisam ser publicados no ambiente de destino.

## 1. Objetivo

Permitir que o administrador agende a liberação dos anexos de uma proposta. A proposta será criada e aparecerá imediatamente para o cliente, mas seus anexos permanecerão privados até a data e o horário definidos. No vencimento, o backend concederá acesso pelo Google Drive com `sendNotificationEmail: true`, para que o e-mail seja enviado pelo próprio Google Drive.

Os arquivos continuarão sendo enviados ao Drive durante a criação da proposta. Não será introduzido worker separado, Redis ou serviço próprio de e-mail.

## 2. Decisões confirmadas

- O e-mail deve ser nativo do Google Drive.
- A proposta aparece imediatamente no portal do cliente.
- Os anexos e as ações de aprovar ou solicitar alterações ficam indisponíveis até a liberação.
- Agendamentos serão persistidos no MongoDB e processados no backend principal.
- Datas e horários usam `America/Sao_Paulo`; o instante persistido será UTC.
- Agendamentos pendentes podem ser reagendados ou liberados imediatamente.
- A exclusão da proposta cancela o agendamento e envia sua pasta privada à lixeira.
- Falhas terão tentativas automáticas, estado visível e ação manual de nova tentativa.
- Uma liberação confirmada nunca será enviada automaticamente outra vez.

## 3. Validação técnica inicial obrigatória

Antes de alterar o fluxo de produção, executar uma prova controlada em uma pasta de teste:

1. criar uma pasta privada fora da árvore compartilhada do cliente;
2. inserir um arquivo de teste;
3. criar uma permissão `reader` para um e-mail de teste com `sendNotificationEmail: true`;
4. confirmar recebimento, remetente e conteúdo do e-mail nativo;
5. mover a pasta para uma pasta compartilhada e confirmar que links e permissões permanecem válidos;
6. repetir a operação para a mesma conta e documentar o comportamento de permissão já existente.

Essa prova não deve usar cliente ou proposta real. Se o Drive não enviar a notificação de forma compatível, a implementação deve parar e a decisão funcional precisa ser revista.

## 4. Estrutura de pastas no Drive

### Proposta sem agendamento

Preserva o fluxo atual:

```text
raiz/clientes/{cliente}/propostas/{proposta}/administrador
```

### Proposta agendada

Durante a preparação:

```text
raiz/propostas_agendadas/{proposta}/administrador
```

No horário da liberação:

1. conceder acesso direto à pasta da proposta para cada destinatário;
2. solicitar a notificação nativa em cada nova permissão;
3. criar ou localizar `clientes/{cliente}/propostas`;
4. mover a pasta da proposta para esse destino;
5. marcar a proposta como liberada.

`propostas_agendadas` não poderá herdar permissões dos clientes. O adaptador deverá verificar essa premissa e falhar de forma segura caso um destinatário já possua acesso herdado à pasta privada.

## 5. Persistência

Adicionar à proposta um objeto opcional `release`:

```ts
interface ProposalRelease {
    scheduledAt: Date;
    status: "pending" | "processing" | "released" | "failed" | "cancelled";
    recipients: string[];
    attempts: number;
    nextAttemptAt: Date;
    claimedAt?: Date;
    claimExpiresAt?: Date;
    releasedAt?: Date;
    lastFailureCode?: string;
}
```

Regras:

- propostas antigas e propostas imediatas não possuem `release`;
- `recipients` é uma fotografia normalizada e deduplicada dos e-mails válidos no momento do agendamento;
- mensagens técnicas ou dados sensíveis do Google não serão persistidos em `lastFailureCode`;
- `attachmentFolderId` continua identificando a pasta da proposta;
- horários são armazenados em UTC;
- o contrato público expõe apenas horário, estado e disponibilidade, nunca destinatários, claim ou erro interno.

O polling justifica um índice parcial explícito para liberações pendentes por `status` e `nextAttemptAt`. A criação do índice deve ocorrer por script operacional com modo de inspeção e `--apply`, nunca como escrita implícita durante o bootstrap.

## 6. Contratos públicos

### Administrador

Adicionar à proposta:

- `releaseAt?: string`;
- `releaseStatus?: "pending" | "processing" | "released" | "failed" | "cancelled"`;
- `releasedAt?: string`;
- `attachmentsAvailable: boolean`.

O administrador continua recebendo os links dos anexos para conferência.

### Cliente

Adicionar:

- `releaseAt?: string`;
- `releaseStatus?: "pending" | "processing" | "released" | "failed"`;
- `releasedAt?: string`;
- `attachmentsAvailable: boolean`;
- `attachmentCount: number`.

Enquanto os anexos estiverem privados, o presenter devolve `attachments: []`. O backend também rejeita aprovação e solicitação de alteração com HTTP 409 até a liberação, impedindo contorno por chamada direta.

## 7. Formulário administrativo

Na criação e edição da proposta:

- checkbox `Agendar liberação da proposta`;
- campo `Data da liberação`;
- campo `Horário da liberação`;
- indicação explícita do fuso `Horário de Brasília`;
- data e horário ficam desabilitados quando o checkbox estiver desmarcado;
- ambos se tornam obrigatórios quando o agendamento estiver ativo;
- datas passadas são rejeitadas no frontend e no backend;
- durante edição de uma proposta pendente, data e horário podem ser alterados;
- a ação `Liberar agora` substitui o simples cancelamento, pois os anexos não podem permanecer privados sem agendamento;
- propostas já liberadas não podem voltar ao estado agendado.

O cartão administrativo mostrará `Agendada`, `Processando`, `Liberada` ou `Falha na liberação`, com horário formatado e ação `Tentar novamente` quando aplicável.

## 8. Experiência do cliente

Antes da liberação:

- título, descrição, etapa e horário aparecem normalmente;
- anexos são substituídos por `Disponíveis em DD/MM/AAAA às HH:mm`;
- botões de aprovar e solicitar alterações não são exibidos;
- o estado explica que a proposta aguarda a liberação dos arquivos.

Depois da liberação:

- links dos anexos aparecem;
- ações de decisão são habilitadas;
- a atualização ocorre na próxima consulta ou revalidação da tela;
- o e-mail recebido é o compartilhamento nativo do Google Drive.

## 9. Serviço de liberação

Criar `ProposalReleaseService`, dependente de portas pequenas:

- repositório de agendamentos;
- storage de proposta;
- storage de permissões;
- leitura dos destinatários do briefing;
- `Clock`.

Responsabilidades:

- validar e criar o agendamento;
- reagendar uma proposta pendente;
- liberar imediatamente;
- processar uma liberação capturada;
- liberar permissões sequencialmente;
- mover a pasta para o destino definitivo;
- registrar sucesso ou próxima tentativa;
- permitir nova tentativa manual após falha final.

O adaptador do Drive ganhará operações específicas para upload privado, concessão de acesso notificado e movimentação da pasta. Não será criada novamente uma fachada ampla de Google Drive.

## 10. Agendador no processo principal

Criar `ProposalReleaseScheduler` com ciclo de vida explícito:

- iniciar somente depois da conexão com MongoDB e da composição da aplicação;
- consultar em intervalo curto, inicialmente 30 segundos;
- capturar um lote pequeno de liberações vencidas;
- usar `findOneAndUpdate` atômico para trocar `pending/failed` por `processing`;
- usar lease com vencimento para recuperar processos interrompidos;
- processar cada proposta uma vez por claim;
- parar o timer no encerramento do servidor;
- não manter `setTimeout` por proposta.

O claim atômico também protege uma futura execução com mais de uma instância PM2.

Tentativas sugeridas: imediata, 1 minuto, 5 minutos, 15 minutos e 1 hora. Depois disso, o estado fica `failed` até a ação manual. Permissões já criadas serão reconhecidas e não gerarão novo e-mail; o processamento continua somente para destinatários ou etapas restantes.

## 11. Destinatários

Usar a mesma extração de e-mails dos moradores já empregada no compartilhamento do briefing:

- normalizar para minúsculas;
- remover duplicados;
- rejeitar o agendamento quando nenhum e-mail válido estiver disponível;
- capturar a lista na criação para garantir execução determinística;
- alterações posteriores no briefing não mudam silenciosamente um agendamento existente.

Uma alteração futura poderá oferecer seleção explícita dos destinatários, mas isso não entra neste primeiro recorte.

## 12. Concorrência e compensações

- A proposta só é persistida depois que o upload privado retorna pasta e links.
- Falha ao persistir envia a pasta privada à lixeira.
- Exclusão durante processamento depende de claim e estado para não competir com a liberação.
- Reagendamento usa atualização condicional e recusa proposta já capturada ou liberada.
- Permissões são concedidas sequencialmente por limitação já conhecida do Drive.
- Se algumas permissões forem criadas e outra falhar, a tentativa seguinte ignora as existentes.
- Se a movimentação falhar depois dos e-mails, o acesso direto permanece válido; a nova tentativa move a pasta sem reenviar notificações.
- `released` só é gravado após permissões e movimentação confirmadas.

## 13. Etapas de implementação

### Etapa 1 — prova do Drive e contratos

- executar a prova controlada;
- documentar o e-mail real;
- criar tipos, validação de data e contratos públicos;
- adicionar testes de parsing, passado e fuso horário.

### Etapa 2 — persistência e captura atômica

- ampliar schema e repositório;
- implementar claim, lease, reagendamento, sucesso e falha;
- criar script do índice parcial;
- testar concorrência, reinício e compatibilidade de propostas antigas.

### Etapa 3 — armazenamento privado e liberação no Drive

- criar pasta privada de preparação;
- fazer upload agendado fora da árvore compartilhada;
- conceder permissões notificadas;
- mover a pasta ao destino final;
- cobrir falhas e compensações com cliente Drive simulado.

### Etapa 4 — serviço e agendador

- implementar `ProposalReleaseService`;
- implementar `ProposalReleaseScheduler` no processo principal;
- conectar start/stop ao bootstrap;
- adicionar tentativas e ação manual.

### Etapa 5 — interface administrativa

- adicionar checkbox, data e horário à view;
- implementar validação e envio multipart;
- mostrar estados, reagendamento, liberação imediata e nova tentativa;
- atualizar persistência visual após mutações.

### Etapa 6 — interface do cliente

- ocultar links privados no presenter;
- mostrar horário de disponibilidade;
- bloquear decisões antes da liberação no frontend e backend;
- reconciliar o cartão quando a revalidação detectar a liberação.

### Etapa 7 — auditoria final e operação

- build, testes unitários, HTTP, integração controlada e E2E;
- validar reinício durante processamento;
- validar ausência de e-mail duplicado;
- sincronizar views persistidas;
- aplicar o índice explicitamente;
- documentar monitoramento e recuperação manual.

## 14. Cobertura mínima

- proposta imediata mantém o comportamento atual;
- agendamento exige data, hora futura e destinatário;
- horário de Brasília converte corretamente para UTC;
- cliente vê a proposta, mas não recebe links nem pode decidir antes da liberação;
- upload ocorre no momento da criação;
- scheduler ignora propostas futuras;
- duas execuções não capturam a mesma proposta;
- reinício recupera lease vencido;
- permissão existente não dispara e-mail duplicado;
- falha parcial retoma do ponto seguro;
- movimentação após permissão mantém acesso;
- reagendamento altera somente proposta pendente;
- liberar agora executa uma única vez;
- exclusão cancela e remove a pasta privada;
- erro final aparece para o administrador e permite nova tentativa;
- propostas antigas continuam legíveis.

## 15. Publicação

A entrega exigirá:

- publicação conjunta de frontend e backend;
- sincronização das views administrativas de propostas e de aprovações do cliente;
- criação explícita do índice de agendamentos;
- confirmação de que `propostas_agendadas` é privada;
- teste com contas de Drive próprias de homologação;
- reinício do PM2 para iniciar o scheduler.

Não haverá migração de propostas antigas nem worker separado. Nenhum cliente, arquivo ou e-mail real deve ser usado durante desenvolvimento e testes automatizados.
