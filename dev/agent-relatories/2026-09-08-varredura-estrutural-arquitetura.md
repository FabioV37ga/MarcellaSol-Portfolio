# Varredura estrutural e arquitetural — 08/09/2026

## 1. Objetivo e escopo

Esta análise revisa o estado atual do backend, dos frontends administrativo e do cliente, das views persistidas em MongoDB, das integrações externas e da suíte de testes. O foco é responsabilidade, componentização, legibilidade, evolução segura e escalabilidade operacional.

A varredura foi estática e local. Não houve conexão com o banco de produção, Google Drive ou VPS, nem alteração de dados reais. Consequentemente, capacidade, latência, cardinalidade das coleções e comportamento sob carga precisam ser confirmados por métricas de produção ou testes controlados.

## 2. Resumo executivo

O sistema evoluiu positivamente em quatro pontos: serviços de aplicação substituíram parte da lógica direta nos controllers; autenticação e sessões possuem fronteiras explícitas; eventos financeiros foram separados em coleção append-only; e as views persistidas agora possuem inventário, taxonomia e validação estrutural antes da sincronização. A recente extração de `ClientFinancialModule` também mostrou uma direção adequada para modularizar por fluxo funcional.

Os maiores riscos arquiteturais atuais não estão na quantidade total de código, mas em algumas concentrações específicas e em operações síncronas que atravessam MongoDB, Drive e geração de PDF dentro da mesma requisição. As prioridades recomendadas são:

1. corrigir o destaque financeiro para que seja independente da página carregada;
2. criar uma camada de contratos HTTP validada em runtime e reduzir controllers/API clients monolíticos;
3. retirar geração de PDF e outras integrações demoradas do ciclo síncrono das requisições;
4. explicitar a composição e as transações exigidas pelo MongoDB;
5. modularizar o briefing do cliente antes de ampliar esse formulário;
6. paginar clientes e propostas antes que essas coleções cresçam;
7. implantar observabilidade mínima e testes HTTP/MongoDB de integração.

## 3. Visão estrutural atual

### Backend

O backend segue uma separação reconhecível:

- `routes`: endpoints e middlewares;
- `controllers`: adaptação HTTP;
- `application`: casos de uso;
- `repositories`: acesso ao MongoDB;
- `models`: schemas Mongoose;
- `services`: integrações e serviços técnicos;
- `domain`: parte do vocabulário financeiro;
- `scripts`: manutenção e sincronização operacional.

A direção é boa, mas as fronteiras não são uniformes. Muitos serviços criam suas próprias dependências em parâmetros padrão, enquanto somente `ClientPaymentService` é composto explicitamente no bootstrap. Controllers continuam centralizando tradução de erros e dezenas de handlers.

### Frontend

Administrador e cliente possuem controllers de inicialização, routers, módulos de tela, selectors, templates e clientes HTTP. Há infraestrutura compartilhada para ciclo de vida das views, etapas, sessão e apresentação financeira.

As views vindas do banco são tratadas como templates confiáveis, materializadas em `HTMLElement` no início da sessão. O mecanismo é funcional e agora validado, mas ainda não possui versão de contrato negociada entre frontend e banco.

### Persistência e integrações

- MongoDB mantém clientes, briefings, propostas, cobranças, eventos financeiros, sessões e views.
- Google Drive funciona como armazenamento de anexos e relatórios.
- Puppeteer gera relatórios PDF no backend.
- Rascunhos do briefing usam `localStorage` e IndexedDB no navegador.

## 4. Indicadores de concentração

Arquivos TypeScript com maior concentração de responsabilidades:

| Arquivo | Linhas aproximadas | Responsabilidades observadas |
|---|---:|---|
| `client/templates/briefing/preferences.template.ts` | 777 | conteúdo, marcação e opções de muitas preferências |
| `client/controllers/briefing.controller.ts` | 741 | navegação, regras, rascunho, arquivos, captura e envio |
| `application/client-payment.service.ts` | 699 | cálculo, validação, casos de uso, Pix, paginação e DTOs |
| `admin/ui/client-financial-manager.ts` | 628 | formulário, prévia, renderização, exclusão e status |
| `admin/infrastructure/admin-system.api.ts` | 501 | todos os contratos e endpoints administrativos |
| `admin/controllers/newClient/briefing.controller.ts` | 490 | montagem e interação do briefing administrativo |
| `admin/modules/admin-system.modules.ts` | 455 | home, clientes, gestão, financeiro e criação |
| `services/briefing-report.ts` | 385 | transformação de dados, HTML, estilos, assets e PDF |
| `services/googleDrive.ts` | 381 | múltiplas operações e políticas do Drive |
| `scripts/sync-database-views.ts` | 388 | catálogo, parser, validação, comparação e sincronização |

Tamanho não é defeito isoladamente. Ele se torna relevante quando o arquivo muda por motivos diferentes, exige dependências heterogêneas ou dificulta testar uma regra sem montar toda a tela/serviço.

## 5. Achados prioritários

### ARQ2-001 — destaque financeiro depende da página carregada

Estado em 08/09/2026: **resolvido**. A API passou a devolver uma projeção de destaque calculada no MongoDB sobre todas as cobranças ativas do cliente. A página continua paginada e o frontend apenas apresenta o candidato oficial, inclusive quando sua cobrança não está entre os cartões carregados.

Prioridade: **alta**  
Tipo: correção funcional / escalabilidade

`ClientFinancialModule` entrega ao componente de destaque apenas o array `payments` já carregado. `selectHighlightedPaymentPart` então procura vencidos, parcela do mês e próxima parcela somente nesse array. Depois da paginação, um pagamento antigo não carregado pode conter a parcela vencida que deveria ser o destaque.

O resumo global já é independente da página, mas o destaque ainda não é. A API deve devolver um `highlight` calculado no backend sobre todas as partes relevantes, ou manter uma projeção financeira por cliente atualizada junto às mutações.

Recomendação:

- definir `FinancialHighlightContract` no contrato compartilhado;
- calcular o candidato com aggregation/projeção indexável;
- devolver o destaque na primeira página e após mutações que possam alterá-lo;
- manter no frontend apenas apresentação e contagem regressiva.

### ARQ2-002 — `ClientPaymentService` reúne regras de naturezas distintas

Estado em 10/09/2026: **resolvido**. Cálculo e vencimentos foram extraídos para `payment-schedule.ts`; tipos e validações escalares para `payment-input.ts`; DTOs administrativo/público para `payment-presenter.ts`; paginação, cursor opaco, resumo compatível e prioridade do destaque global para `payment-pagination.ts`; criação, validade, QR Code e resposta Pix para `pix-presentation.service.ts`. A fachada e os reexports públicos foram preservados, enquanto `ClientPaymentService` passou a concentrar a orquestração dos casos de uso.

Prioridade: **alta**  
Tipo: responsabilidade / testabilidade

O serviço combina:

- parsing e validação de entrada HTTP;
- cálculo de cronograma e datas;
- comandos de criação, edição, baixa e estorno;
- paginação e codificação de cursor;
- geração e apresentação Pix/QR Code;
- auditoria e snapshots;
- serialização de DTO administrativo e público;
- compatibilidade legada dos testes/repositórios.

Essa concentração aumenta o raio de mudança do domínio financeiro. A extração deve preservar uma fachada de aplicação, mas separar módulos puros:

- `payment-schedule.ts`: cálculo e datas, sem Mongoose;
- `payment-input.ts`: validação/parsing;
- `payment-presenter.ts`: DTO admin/cliente;
- `payment-pagination.ts`: cursor e contratos de página;
- `pix-presentation.service.ts`: janela, BR Code e QR;
- `client-payment.service.ts`: somente orquestração dos casos de uso.

### ARQ2-003 — composição de dependências é parcial e implícita

Prioridade: **alta**  
Tipo: arquitetura / testabilidade

O bootstrap instancia apenas o serviço financeiro e os dois controllers. Os demais serviços e repositories são construídos por parâmetros padrão dentro de controllers e serviços. Isso torna o grafo real de dependências invisível e dificulta substituir Drive, relógio, gerador de IDs ou persistência em testes.

Recomendação: criar uma composition root única que construa repositories, gateways e casos de uso. Dependências voláteis devem ser portas explícitas (`Clock`, `IdGenerator`, `ReportRenderer`, `AttachmentStorage`). Não é necessário adotar um container de injeção; fábricas tipadas são suficientes.

### ARQ2-004 — geração de PDF e integrações externas permanecem síncronas

Prioridade: **alta**  
Tipo: operação / escalabilidade

A geração de relatório monta HTML, carrega assets, abre Puppeteer, gera PDF e interage com Drive durante uma requisição administrativa. Em uma VPS básica, Chromium é uma das cargas mais caras em memória e CPU. Drive também introduz latência e falhas fora do controle da aplicação.

Recomendação incremental:

1. persistir um `report-job` com estados `queued/running/succeeded/failed`;
2. responder `202 Accepted` e permitir consulta de estado;
3. executar um worker com concorrência 1 na VPS;
4. tornar a operação idempotente por cliente + versão do briefing;
5. registrar tentativas e erro sanitizado;
6. somente depois considerar Redis/BullMQ; inicialmente uma coleção Mongo e um worker simples são suficientes.

O mesmo padrão deverá receber futuramente envio de e-mails e outras notificações.

### ARQ2-005 — consistência entre agregados depende de compensações manuais

Prioridade: **alta**  
Tipo: consistência

Criar, reenviar ou decidir uma proposta também altera a etapa do cliente e pode manipular uma pasta no Drive. O serviço possui rollbacks compensatórios, mas MongoDB e Drive não compartilham transação. Uma queda do processo entre passos ainda pode deixar proposta, etapa e anexos divergentes.

Recomendação:

- usar transação MongoDB para proposta + estado do cliente;
- tratar Drive como efeito externo por outbox;
- registrar uma operação idempotente antes do upload/rename/trash;
- disponibilizar rotina de reconciliação para operações incompletas;
- nunca depender apenas de rollback em memória após exceção.

### ARQ2-006 — requisito de replica set para transações não está formalizado

Estado em 09/09/2026: **resolvido**. O bootstrap detecta suporte transacional em replica set ou mongos, e o readiness retorna 503 quando a conexão não oferece essa capacidade. O deploy ganhou um smoke test que executa e aborta uma escrita temporária, confirmando que nada foi persistido, além de documentação operacional específica.

Prioridade: **alta**  
Tipo: infraestrutura

Mutações financeiras e exclusão de cliente usam `withTransaction`. Isso exige uma topologia MongoDB compatível. O bootstrap apenas conecta e não verifica capacidade transacional. Um ambiente configurado como standalone pode falhar somente no primeiro pagamento real.

Recomendação: documentar replica set como pré-requisito, verificar a topologia no readiness e executar um smoke test transacional no processo de implantação. Se a KingHost hospedar Mongo fora da VPS, registrar claramente responsabilidade por backup, replica set e restore.

### ARQ2-007 — controllers HTTP repetem adaptação e tratamento de erros

Prioridade: **média-alta**  
Tipo: legibilidade / consistência

`AdminController` possui cerca de 365 linhas e muitos blocos `try/catch` semelhantes. `ClientController` repete o padrão. Isso facilita divergência de status, mensagem e log entre endpoints.

Recomendação:

- criar um adaptador `asyncRoute` que encaminhe erros ao middleware central;
- fazer `ApplicationError` carregar código estável além da mensagem;
- concentrar M apenas em extrair parâmetros, chamar caso de uso e escolher status de sucesso;
- separar controllers por recurso: `AdminClientController`, `ProposalController`, `PaymentController` e `SessionController`.

### ARQ2-008 — contratos HTTP são TypeScript-only e serializados manualmente

Estado em 09/09/2026: **parcialmente resolvido**. As respostas financeiras consumidas pelo administrador e pelo cliente agora passam por validação runtime compartilhada, incluindo pagamentos, parcelas, paginação, resumo e destaque global. Respostas incompletas ou com tipos divergentes deixam de atravessar a aplicação por simples type assertion. Permanecem como evolução a geração de OpenAPI e a adoção do mesmo padrão nos contratos de propostas e briefing.

Prioridade: **média-alta**  
Tipo: contrato / confiabilidade

O contrato financeiro compartilhado reduziu duplicação entre os frontends, mas o backend não o valida em runtime. Requests usam campos `unknown` validados manualmente e responses são objetos construídos manualmente. O frontend faz type assertion após `response.json()`, o que não protege contra payload incompatível.

Recomendação: adotar schemas runtime na fronteira HTTP, preferencialmente uma fonte única capaz de inferir tipos e gerar OpenAPI. Aplicar primeiro em financeiro e propostas. Validar request, response em testes e erros padronizados. Evitar compartilhar diretamente modelos Mongoose com o frontend.

### ARQ2-009 — listagens de clientes e propostas ainda são ilimitadas

Prioridade: **média-alta**  
Tipo: escalabilidade

`ClientRepository.findAllForAdmin()` retorna todos os clientes e `ClientProposalRepository.findByUserId()` retorna todas as propostas do cliente. A paginação financeira resolveu esse problema somente para cobranças.

Recomendação:

- paginação por cursor também para clientes e propostas;
- busca administrativa por nome/login com índice adequado;
- filtro por status/etapa para propostas;
- contagem/resumo separada da página;
- virtualização no DOM somente se a paginação ainda produzir listas grandes.

### ARQ2-010 — resumo financeiro global é recalculado em todas as páginas

Prioridade: **média**  
Tipo: desempenho

Cada clique em “Carregar mais” executa novamente a aggregation de resumo do cliente. Com poucos registros é aceitável, mas o custo cresce com o histórico e se repete mesmo quando nenhuma mutação ocorreu.

Recomendação: retornar o resumo somente na primeira página, ou aceitar `includeSummary=false` nas próximas. Em escala maior, manter uma projeção por cliente atualizada atomicamente a partir dos eventos financeiros e reconciliada periodicamente.

### ARQ2-011 — manutenção Pix executa varreduras e updates sem lote

Prioridade: **média**  
Tipo: operação

O script de retenção faz aggregation e `updateMany` globais. O modo de prévia é uma proteção importante, mas em uma coleção grande a aplicação pode gerar carga prolongada e modificar muitos documentos em uma única execução.

Recomendação: processar por `_id` em lotes configuráveis, criar índice compatível com a seleção da janela expirada se métricas justificarem, informar examinados/modificados/duração e permitir retomada por cursor. Manter `--apply` explícito e acrescentar limite máximo por execução.

### ARQ2-012 — briefing do cliente é um controlador multifuncional

Prioridade: **média**  
Tipo: componentização / manutenção

`briefing.controller.ts` concentra montagem das páginas, navegação, visibilidade condicional, validação, rascunho textual, cache de arquivos, captura de respostas e submissão. O rascunho referencia campos por `pageKey + fieldIndex`; reordenar controles na view pode restaurar dados em outro campo caso tipo e posição coincidam.

Recomendação:

- usar identificadores estáveis de resposta definidos na view/schema, nunca índice visual;
- extrair `BriefingDraftService`, `BriefingFileDraftService`, `BriefingAnswerCollector` e `BriefingSubmissionFlow`;
- manter o controller como coordenador;
- versionar e migrar o formato do rascunho;
- adicionar testes de restauração após reordenação de campos.

### ARQ2-013 — módulos administrativos ainda misturam múltiplos fluxos

Prioridade: **média**  
Tipo: responsabilidade

`AdminSystemModules` controla home, listagem/exclusão de clientes, gestão individual, relatório, entrada no financeiro e criação. `AdminSystemApi` possui 18 chamadas `fetch` e agrega contratos de todos os recursos.

Recomendação por oportunidade:

- extrair `AdminClientsModule` ao implementar paginação/busca;
- extrair `AdminClientManagementModule` ao alterar relatórios;
- dividir API em `clients.api`, `proposals.api`, `payments.api`, `views.api` e um `http-client` autenticado comum;
- manter uma fachada temporária para reduzir o tamanho do diff de migração.

### ARQ2-014 — views persistidas não possuem versão de contrato em runtime

Prioridade: **média**  
Tipo: arquitetura de UI

O pipeline valida inventário, HTML, IDs e classes locais, o que reduz muito o risco de atualização manual. Entretanto, a aplicação baixa todas as views e não verifica um `schemaVersion`/`revision` compatível com o bundle publicado. Um deploy parcial pode combinar JavaScript novo com view antiga até a sincronização terminar.

Recomendação:

- adicionar `schemaVersion` e `revision` às views;
- o bundle declarar versões mínimas por `viewName`;
- API devolver ETag ou revisão do conjunto;
- falhar com tela de manutenção clara em incompatibilidade;
- publicar views antes do frontend quando forem retrocompatíveis, ou usar revisão atômica do conjunto;
- evitar edição manual direta em produção fora do script validado.

### ARQ2-015 — HTML persistido é uma fronteira privilegiada

Prioridade: **média**  
Tipo: segurança / governança

As views do banco são convertidas em DOM e podem conter qualquer marcação aceita pelo parser do navegador. Hoje o banco e o pipeline são parte da base confiável, mas uma credencial de escrita comprometida permitiria alterar a interface entregue a todos os usuários.

Recomendação: restringir a conta da aplicação a leitura de views, usar credencial separada no sincronizador, manter allowlist de tags/atributos perigosos ou hash de release, registrar autor/revisão e alinhar CSP para impedir scripts inline e origens não autorizadas.

### ARQ2-016 — inicialização depende do banco antes de abrir a porta HTTP

Prioridade: **média**  
Tipo: operação

`startServer` aguarda MongoDB antes de chamar `listen`. Isso evita servir uma aplicação sem persistência, mas também impede que liveness responda durante indisponibilidade do banco. O orquestrador pode interpretar falha de dependência como processo morto e reiniciá-lo continuamente.

Recomendação: separar bootstrap do processo e readiness. Abrir a porta, expor liveness do processo, conectar com política de retry e manter readiness em `503` até Mongo estar pronto. Rotas de negócio devem permanecer indisponíveis nesse estado.

### ARQ2-017 — observabilidade é baseada em mensagens de console

Prioridade: **média**  
Tipo: operação

Erros são registrados com `console.error`/`console.warn`, sem request ID, duração, usuário técnico, operação, resultado ou métrica. Em falhas distribuídas entre MongoDB e Drive, reconstruir a sequência será difícil.

Recomendação: logs JSON estruturados, correlation ID, duração e código de erro; métricas mínimas de latência/taxa de erro por endpoint, fila de relatórios, falhas Drive, conflitos otimistas e sessões; nunca registrar senha, token, BR Code ou conteúdo sensível do briefing.

### ARQ2-018 — suíte possui boa cobertura de regras, mas pouca integração real

Estado em 08/09/2026: **parcialmente resolvido**. A primeira camada de integração financeira foi concluída: foram adicionados testes HTTP reais para o contrato paginado administrativo e do cliente, além de uma suíte MongoDB opt-in que valida cursor, aggregation de resumo/destaque e concorrência otimista. A suíte Mongo recusa a conexão normal, exige `TEST_DB_CONNECTION_STRING`, banco nomeado como teste e replica set. Permanecem como evolução os testes de integração dos demais módulos e os fluxos E2E.

Prioridade: **média**  
Tipo: testes

Há testes úteis de domínio, segurança, contratos, DOM, lifecycle e rotas operacionais. Contudo, grande parte dos testes financeiros e de propostas usa doubles de repositories. Faltam garantias para aggregation, cursores, array filters, transações, índices e serialização real do Express/Mongoose em conjunto.

Recomendação:

- testes HTTP de financeiro, propostas, briefing e views com aplicação Express real;
- MongoDB efêmero configurado como replica set para testar transações;
- testes de repository para cursor estável, resumo, retenção Pix e concorrência por `__v`;
- contract tests das respostas públicas;
- poucos testes E2E para login → navegação → operação principal;
- separar testes unitários, integração e E2E nos scripts de CI.

### ARQ2-019 — configuração TypeScript não usa o modo estrito completo

Prioridade: **baixa-média**  
Tipo: qualidade

Backend e frontend habilitam `noImplicitAny` e `strictNullChecks`, mas não `strict: true`. Opções como `strictFunctionTypes`, `useUnknownInCatchVariables` e `noUncheckedIndexedAccess` podem revelar contratos frágeis, especialmente em acesso por índice e callbacks de infraestrutura.

Recomendação: ativar flags gradualmente, começando pelos módulos compartilhados e domínio financeiro. Não alterar todo o código de uma vez; manter uma lista de exceções temporárias e removê-las por área.

### ARQ2-020 — nomenclaturas legadas atravessam banco, API, CSS e UI

Prioridade: **baixa-média**  
Tipo: semântica / migração

`beated` e `Cancelled` continuam como valores persistidos e aparecem em modelos, queries, contratos e classes CSS. A decisão de não renomear sem migração foi correta, mas o custo de compatibilidade cresce a cada nova funcionalidade.

Recomendação: migrar em etapa isolada para `changes-requested` e `cancelled`, com leitura dupla temporária, escrita canônica, script dry-run/apply, métricas de valores desconhecidos e remoção da compatibilidade somente após um ciclo de deploy.

## 6. Componentizações recomendadas

### Financeiro backend

```text
application/financial/
  client-payment.service.ts       # fachada/orquestração
  payment-commands.service.ts     # criar, editar, baixar, estornar
  payment-query.service.ts        # página, resumo e destaque
  pix-presentation.service.ts     # apresentação Pix e QR
domain/financial/
  payment-schedule.ts             # cálculo puro
  payment-policy.ts               # bloqueios e transições
  payment-events.ts               # fábrica de eventos
presentation/financial/
  payment-input.schema.ts         # contrato runtime
  payment.presenter.ts            # DTO admin/cliente
```

### Briefing cliente

```text
client/briefing/
  briefing.controller.ts          # coordenação
  briefing-page-registry.ts       # páginas e identidade estável
  briefing-answer-collector.ts    # DOM → contrato
  briefing-draft.service.ts       # texto/seleções
  briefing-file-draft.service.ts  # IndexedDB
  briefing-submission.flow.ts     # montagem e envio
```

### Administração

```text
admin/modules/
  admin-home.module.ts
  admin-clients.module.ts
  admin-client-management.module.ts
  admin-client-proposals.module.ts
  admin-client-financial.module.ts
admin/infrastructure/
  authenticated-http-client.ts
  clients.api.ts
  proposals.api.ts
  payments.api.ts
  views.api.ts
```

### Relatórios e tarefas assíncronas

```text
application/jobs/
  enqueue-report.service.ts
  report-worker.ts
repositories/
  job.repository.ts
services/report/
  briefing-report-data.ts
  briefing-report-template.ts
  pdf-renderer.ts
```

## 7. Estratégia de escalabilidade

### Curto prazo — mesma VPS e mesmo MongoDB

- limitar concorrência do Puppeteer a 1;
- paginar clientes e propostas;
- evitar recalcular resumo financeiro em páginas subsequentes;
- executar retenção Pix em lotes;
- habilitar logs estruturados e request ID;
- formalizar backups e teste de restauração;
- confirmar replica set antes do deploy financeiro.

### Médio prazo — crescimento moderado

- worker separado no mesmo host para PDF/e-mail;
- outbox MongoDB para efeitos externos;
- projeção financeira por cliente;
- cache/revisão das views;
- índices acompanhados por `explain` e métricas reais;
- limites de upload e armazenamento observáveis.

### Longo prazo — somente quando métricas exigirem

- separar processo web e worker em serviços distintos;
- armazenamento de objetos dedicado caso Drive deixe de atender o fluxo;
- fila externa se a fila Mongo não oferecer vazão/garantias suficientes;
- CDN/cache para assets e bundle;
- réplicas horizontais do backend, mantendo estado exclusivamente fora do processo.

Não há evidência atual que justifique microserviços. Um monólito modular com worker assíncrono é mais simples e adequado para o estágio do produto.

## 8. Plano priorizado de execução

### Fase 1 — correção e contratos

1. tornar o destaque financeiro independente da página;
2. adicionar testes Mongo/HTTP para paginação, resumo e concorrência;
3. introduzir schemas runtime para financeiro;
4. formalizar requisito e smoke test de transações.

### Fase 2 — operações demoradas e consistência — desconsiderada para a infraestrutura atual

Decisão em 10/09/2026: esta fase foi retirada do plano ativo após avaliação do consumo e da instabilidade operacional observados na VPS básica. A geração de relatório permanece síncrona. Os itens abaixo ficam apenas como referência futura e não entram na contagem vigente.

1. criar job persistido para relatório PDF;
2. mover Puppeteer para worker com concorrência limitada;
3. implementar outbox/reconciliação das operações com Drive;
4. adicionar logs estruturados e correlation ID.

### Fase 3 — modularização orientada por mudança

1. separar cálculo, presenter, paginação e Pix do serviço financeiro;
2. extrair listagem/gestão de clientes ao implementar paginação;
3. dividir API administrativa por recurso;
4. decompor briefing começando por identidade estável e rascunho.

### Fase 4 — governança e dívida controlada

1. versionar contratos das views;
2. separar credenciais de leitura e sincronização das views;
3. migrar `beated`/`Cancelled` com compatibilidade;
4. elevar gradualmente o nível estrito do TypeScript;
5. documentar ADRs para views no banco, Drive, financeiro e jobs.

## 9. Critérios arquiteturais para próximas implementações

Antes de concluir uma nova funcionalidade, verificar:

- a regra de negócio pode ser testada sem DOM, Express ou Mongoose?
- a operação externa é idempotente e reconciliável?
- existe limite/paginação para qualquer coleção crescente?
- request e response têm contrato runtime?
- uma view antiga falha de maneira clara com o bundle novo?
- timers, listeners e requests são descartados ao trocar de tela?
- logs permitem correlacionar a operação sem expor dados sensíveis?
- há procedimento dry-run para qualquer migração de dados reais?
- o teste manual cobre sucesso, erro, recarga e concorrência básica?

## 10. Conclusão

A base atual suporta evolução sem reescrita. O melhor caminho não é quebrar o sistema em serviços independentes, mas fortalecer o monólito modular: contratos de fronteira, composition root explícita, jobs para tarefas pesadas, consistência por transação/outbox e componentização guiada por mudanças reais.

O primeiro item recomendado é ARQ2-001, pois a paginação já introduz uma situação concreta em que o destaque financeiro pode divergir do histórico completo. Em seguida, ARQ2-002 e ARQ2-008 reduzem o custo e o risco das próximas integrações financeiras.
