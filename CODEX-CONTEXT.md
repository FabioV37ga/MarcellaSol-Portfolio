# Contexto operacional para o Codex — MarcellaSol Portfolio

Última atualização: 15/09/2026.

## 1. Como usar este arquivo

Este documento transfere para novas conversas o contexto, as decisões e as preferências estabelecidas durante o desenvolvimento do MarcellaSol Portfolio.

Ao iniciar uma nova instância de Codex neste repositório:

1. leia este arquivo por completo;
2. leia `Architecture.md` por completo;
3. consulte o plano vigente em `dev/agent-relatories/2026-09-12-plano-refatoracao-componentizacao.md`;
4. verifique `git status`, o histórico recente e os arquivos afetados antes de editar;
5. trate o código e o banco atuais como fonte de verdade quando divergirem de um relato histórico;
6. não presuma acesso à VPS, MongoDB, Google Drive ou segredos apenas porque foram discutidos em outro chat.

`Architecture.md` é o contrato arquitetural permanente. Este arquivo o complementa com contexto operacional, histórico, preferências de colaboração e decisões de produto. Em caso de conflito, prevalecem, nesta ordem: pedido atual do usuário, `Architecture.md`, código/contratos atuais e este documento.

## 2. Produto e stack

Sistema profissional para o portfólio e a gestão de clientes de Marcella Sol, designer de interiores.

Áreas principais:

- portfólio público;
- área administrativa;
- área autenticada do cliente;
- briefing configurável;
- etapas do projeto e aprovações;
- propostas com versões, respostas e anexos;
- financeiro com pagamentos reais, parcelas, Pix e auditoria;
- relatórios de briefing e integração com Google Drive;
- views de interface persistidas no MongoDB.

Stack atual:

- frontend: TypeScript, Vite, UmbrellaJS, NanoHTML, Vitest e Playwright;
- backend: Node.js, TypeScript, Express, Mongoose e `node:test`;
- banco: MongoDB;
- arquivos e relatórios: Google Drive e Google OAuth;
- produção: VPS, PM2, frontend compilado em `frontend/dist` e backend Node;
- não usar React: o sistema não utiliza React.

## 3. Preferências permanentes do responsável pelo projeto

- Conversar e entregar respostas em português do Brasil.
- Incluir neste `CODEX-CONTEXT.md` novas preferências expressas durante o chat, registrando o escopo quando forem específicas de uma tarefa ou situação.
- Implementar com autonomia quando o escopo estiver claro.
- Perguntar antes de alterar decisões relevantes de arquitetura, experiência, dados, segurança, custos, integrações externas ou escopo.
- Preferir componentização real e separação por responsabilidade.
- Não criar abstrações genéricas ou arquivos sem responsabilidade concreta.
- Preservar compatibilidade e comportamento durante refatorações.
- Ao pedir `resumo`, responder de forma simples, por exemplo: `Etapa 1: concluída`, `Etapa 2: 3/4`.
- Nos resumos com etapas, marcar os itens concluídos com ✅.
- Ao final de toda implementação, fornecer:
  - resumo do resultado;
  - validações executadas;
  - fluxo de teste manual;
  - sincronização de view ou migração necessária;
  - sugestão de texto de commit.
- Encerrar toda entrega de implementação com uma seção explícita `Fluxo de teste manual`, contendo os passos que o responsável deve executar, mesmo quando a alteração já possuir testes automatizados.
- Toda implementação funcional deve criar ou ampliar um teste E2E.
- Avisos e erros repetitivos nos logs devem ser corrigidos na origem; não esconder warnings globalmente quando houver correção suportada.
- Evitar deixar o usuário sem atualização durante trabalhos demorados.

## 4. Contrato arquitetural resumido

### Backend

Fluxo obrigatório:

```text
route → middleware → controller → application service → port/repository → infrastructure
```

- Rotas definem endpoints, autenticação e middlewares.
- Middlewares tratam autenticação, rate limit, upload e preocupações HTTP transversais.
- Controllers traduzem HTTP e coordenam; não possuem regra de negócio, Mongoose ou Google Drive.
- Serviços de aplicação implementam casos de uso, validações e compensações.
- Domínio contém regras puras e cálculos sem frameworks.
- Repositórios encapsulam Mongoose, consultas e mutações.
- Serviços técnicos encapsulam Drive, PDF, Pix e integrações.
- `backend/src/composition` conecta implementações concretas às portas.

### Frontend

Fluxo obrigatório:

```text
router → módulo de tela → componente/flow → API de infraestrutura
                     ↘ selector/view/template
```

- Routers controlam URL, histórico e restauração após F5.
- Módulos representam telas ou capacidades completas e possuem ciclo de vida.
- Componentes encapsulam interações coesas.
- APIs de infraestrutura são donas de URL, autenticação, `FormData`, JSON e parsing.
- Módulos e componentes não chamam `fetch` diretamente.
- Selectors centralizam o contrato DOM.
- Templates geram itens repetidos, não telas inteiras persistidas.
- Agregadores apenas compõem, encaminham rotas e coordenam alto nível.

### Nomenclatura

- `*Module`: tela ou capacidade funcional;
- `*Flow`: sequência de uma operação no frontend;
- `*Service`: caso de uso ou serviço técnico coeso;
- `*Repository`: persistência;
- `*.api.ts`: HTTP de um recurso;
- `*.selector.ts`: contrato DOM;
- `*.template.ts`: itens repetidos;
- `*.storage.ts`: armazenamento;
- `*.mapper.ts`: transformação pura;
- `*.presenter.ts`: contrato de saída.

## 5. Responsabilidade por diretório

Backend:

- `backend/src/routes`: endpoints e middlewares;
- `backend/src/middleware`: autenticação, limites e multipart;
- `backend/src/controllers`: tradução HTTP;
- `backend/src/application`: casos de uso;
- `backend/src/application/ports`: interfaces substituíveis;
- `backend/src/domain`: regras puras;
- `backend/src/models`: schemas Mongoose;
- `backend/src/repositories`: persistência MongoDB;
- `backend/src/services`: adaptadores técnicos;
- `backend/src/composition`: injeção e wiring;
- `backend/src/config`: configuração;
- `backend/src/scripts`: migrações e operações explícitas;
- `backend/test`: testes de domínio, aplicação, HTTP, contratos e integração.

Frontend, dentro de `admin`, `client` ou `portfolio`:

- `controllers`: inicialização;
- `navigation`: rotas e histórico;
- `modules`: telas e fluxos funcionais;
- `ui`: componentes menores;
- `infrastructure`: HTTP e armazenamento técnico;
- `selectors`: elementos tipados das views;
- `templates`: itens repetidos;
- `views`: montagem e descarte;
- `styles`: CSS por área ou componente;
- `utils`: somente funções pequenas sem estado ou regra de domínio.

`frontend/src/shared` recebe apenas contratos ou componentes usados de fato por mais de uma área.

## 6. Views persistidas no MongoDB

Este é um contexto crítico: a estrutura principal das interfaces administrativa e do cliente é retornada pelo banco por meio do sistema de views.

Regras:

- `dev/database/*-view.json` é a referência versionada das views do MongoDB.
- Alteração estrutural de UI começa no JSON correspondente em `dev/database`.
- O responsável substitui ou sincroniza manualmente a view no banco quando necessário.
- Não reconstruir uma view persistida criando dezenas de elementos, classes e atributos em TypeScript.
- O TypeScript deve selecionar e reutilizar os elementos existentes.
- Criação dinâmica é apropriada para coleções, cartões, linhas, anexos e opções derivados de dados.
- IDs, classes e atributos acessados pelo código são contratos e devem ficar em selectors.
- Informar na entrega qual JSON precisa ser sincronizado.

Comandos:

```bash
npm run views:validate
npm run views:check
npm run views:sync
```

`views:sync` altera o banco e só deve ser usado com autorização e ambiente devidamente configurado.

## 7. Decisões funcionais estabelecidas

### Etapas do projeto

Ordem vigente:

1. briefing;
2. layout;
3. desenvolvimento do projeto;
4. levantamento;
5. orçamentos e definições;
6. projeto executivo e detalhamentos;
7. entrega final.

As etapas anteriores à atual aparecem como concluídas/verdes. A etapa atual também aparece verde quando estiver aprovada/concluída.

O administrador pode editar etapa e status manualmente. Alterações são persistidas no próprio documento do cliente.

Status relevantes incluem:

- não iniciada;
- em andamento;
- aguardando aprovação;
- alterações solicitadas;
- em alteração;
- aprovado;
- concluído;
- aguardando cliente;
- aguardando fornecedor;
- em revisão interna;
- pausado;
- bloqueado.

Preservar valores persistidos e contratos definidos em `projectStage` e nos contratos compartilhados; não traduzir labels visuais em novos valores de banco sem migração.

### Propostas

- Uma proposta administrativa pertence a uma etapa.
- Na tela administrativa, propostas enviadas, reenviadas legadas e com alterações solicitadas ficam em `Propostas abertas`; aprovadas, com alterações concluídas e canceladas ficam em `Histórico de propostas`.
- Ao criar, a etapa associada vira `aguardando aprovação` e etapas anteriores são concluídas.
- Aprovação do cliente marca a proposta como aprovada e atualiza a etapa.
- Solicitação de alteração marca a proposta e a etapa como alterações solicitadas.
- O termo visual correto é `Solicitar alteração`, não `rebater`.
- O valor legado `beated` ainda pode existir no contrato persistido e deve ser migrado somente com compatibilidade explícita.
- Aprovar e solicitar alteração abrem diálogo com comentário.
- Solicitar alteração exige checkbox confirmando o uso de uma rodada.
- Administrador pode editar título, descrição, anexar novos arquivos e remover anexos; não há mais reenvio.
- A aprovação inicial do cliente permanece. Depois de uma solicitação de alteração (`beated`), o administrador usa `Confirmar alterações`.
- O diálogo pergunta: `Deseja alterar o status da proposta para 'Alterações concluídas'?` e oferece cancelamento ou confirmação.
- Confirmar muda a proposta para `changes-completed` (`Alterações concluídas`), coloca a etapa vinculada em `awaiting-client` (`Aguardando cliente`) e encerra a proposta sem nova aprovação do cliente. Histórico e anexos são preservados.
- O status legado `resent` permanece legível; novos reenvios não são permitidos. O endpoint vigente é `POST /api/admin/clients/:id/proposals/:proposalId/complete-changes`.
- Cliente pode anexar um ou mais arquivos tanto ao aprovar quanto ao solicitar alteração.
- Respostas e anexos formam histórico e não devem ser sobrescritos.

Estrutura do Drive:

```text
clientes/<cliente>/propostas/<titulo-id>/
├── administrador/
└── cliente/
    ├── resposta-1/
    ├── resposta-2/
    └── ...
```

### Briefing

- Rascunho textual fica em serviço próprio.
- Arquivos de rascunho ficam no IndexedDB por meio de serviço próprio.
- Respostas usam identificadores estáveis e mantêm leitura do formato legado.
- Nomes multipart técnicos são ASCII e determinísticos; o nome original permanece no manifesto.
- Falha no envio preserva respostas e anexos para nova tentativa.
- O rascunho só é limpo após confirmação de sucesso.
- E-mails dos responsáveis no briefing podem receber acesso de leitura à pasta do Drive.

### Financeiro

Existem pagamentos reais no banco de dados. Toda mudança financeira exige cuidado adicional.

- Valores são armazenados/calculados em centavos.
- Manter precisão, moeda, fuso, histórico e auditoria.
- Paginação usa cursor.
- Mutações relevantes usam versão/concorrência otimista e, quando necessário, transação.
- Exclusão é arquivamento com registro de auditoria e confirmação reforçada se houver recebimentos.
- Pix possui apresentação própria, validade e QR Code.
- Não executar migrações destrutivas nem reescrever pagamentos silenciosamente.

### Sessão e navegação

- Admin e cliente devem restaurar a rota atual após F5 quando a sessão estiver salva.
- Rotas privadas derivam identidade da sessão, nunca de identificador confiado enviado pelo cliente.
- Logout usa o cliente HTTP compartilhado e limpa o estado local mesmo em falhas toleradas.

## 8. Infraestrutura HTTP vigente

- `HttpClient` e `HttpError` concentram URL base, Bearer, JSON, respostas vazias e erros.
- APIs são separadas por recurso:
  - `AdminClientsApi`;
  - `AdminPaymentsApi`;
  - `AdminProposalsApi`;
  - `AdminViewsApi`;
  - `ClientPaymentsApi`;
  - `ClientProposalsApi`;
  - `ClientViewsApi`.
- `AdminSystemApi` e `ClientSystemApi` são fachadas temporárias de compatibilidade e não devem voltar a conter `fetch`.
- Gateways pequenos devem ser usados nas dependências dos módulos.

## 9. Integrações, falhas parciais e migrações

- Frontend e controllers não acessam Google Drive diretamente.
- Operações de Drive ficam separadas por briefing, relatórios, propostas e permissões.
- Upload concluído sem persistência deve ser compensado.
- Exclusão no Drive deve preferir lixeira e permitir restauração se o banco falhar.
- Migrações nunca rodam automaticamente no boot.
- Scripts de migração devem oferecer prévia sem escrita e exigir `--apply` para mutação.
- Scripts precisam ser idempotentes e resumir encontrados, alterados e falhas.
- Dados e formatos legados devem continuar legíveis até a migração ser comprovada.

## 10. Segurança e privacidade

- Validar autenticação e papel em toda rota privada.
- Aplicar rate limit onde houver abuso possível.
- Limitar quantidade e tamanho de uploads no backend.
- Tratar nomes de arquivo, URLs e IDs como dados não confiáveis.
- Nunca registrar tokens, senhas, chaves Pix ou credenciais OAuth.
- Erros públicos não expõem stack, consulta, configuração ou segredo.
- Não inserir credenciais reais neste arquivo.
- Acesso à VPS ou integrações externas deve ser confirmado em cada ambiente.

## 11. Testes e definição de pronto

Toda implementação deve adicionar ou ampliar ao menos um E2E do comportamento afetado.

Testes proporcionais:

- domínio: regras puras;
- aplicação: sucesso, validação, rollback e falha parcial;
- repositório: escopo, paginação, concorrência e compatibilidade;
- HTTP: autenticação, parsing, status e resposta;
- frontend: estado, renderização, lifecycle e APIs;
- views: raiz, IDs, classes e selectors;
- integrações: mocks nos testes normais; teste real somente quando habilitado explicitamente.

Comandos mínimos antes de concluir:

```bash
npm run build
npm test
git diff --check
git status --short
```

Regra permanente: criar ou ampliar o E2E aplicável, mas nunca executar `npm run test:e2e` por iniciativa própria. A execução só ocorre quando o usuário pedir explicitamente; caso contrário, informar na entrega que ela ficou pendente.

Se testes HTTP falharem com `listen EPERM` dentro do sandbox, repetir com a permissão apropriada para abrir portas locais. Não interpretar isso como regressão do produto.

Se um teste não puder ser executado, informar qual e por quê. Uma integração MongoDB pode aparecer como ignorada quando sua variável de habilitação não estiver ativa.

Critério de pronto:

- responsabilidade no componente correto;
- comportamento e compatibilidade preservados;
- falhas parciais seguras;
- testes proporcionais e E2E;
- build aprovado;
- diff revisado;
- teste manual fornecido;
- migração/view informada;
- commit sugerido;
- plano atualizado quando aplicável.

## 12. Processo de implementação esperado

Antes:

1. ler `CODEX-CONTEXT.md` e `Architecture.md`;
2. inspecionar fluxo atual, contratos, testes e view de referência;
3. verificar dados reais e compatibilidade;
4. definir o dono da responsabilidade;
5. perguntar quando uma decisão relevante estiver ausente.

Durante:

1. fazer alterações incrementais;
2. não misturar refatoração ampla com mudança funcional sem necessidade;
3. preservar mudanças não relacionadas do usuário;
4. usar `apply_patch` para edições manuais;
5. manter controllers e agregadores pequenos;
6. adicionar testes no mesmo recorte;
7. atualizar o relatório de acompanhamento.

Depois:

1. executar build e testes comuns; executar E2E somente mediante pedido explícito;
2. executar `git diff --check`;
3. inspecionar arquivos inesperados;
4. entregar resultado, teste manual e commit sugerido.

## 13. Padrão das respostas do Codex

Durante o trabalho:

- iniciar com uma atualização curta quando houver ferramentas ou edição;
- dizer qual responsabilidade está sendo investigada ou alterada;
- comunicar descobertas relevantes e falhas reais;
- não despejar logs extensos sem síntese;
- não solicitar confirmação para passos normais e reversíveis dentro do escopo.

Resposta final:

1. começar pelo resultado;
2. listar mudanças principais sem excesso de formatação;
3. informar testes com quantidades e falhas/ignorados;
4. fornecer teste manual numerado;
5. indicar view ou migração necessária, inclusive quando não houver;
6. sugerir commit em bloco de código.

Exemplo curto:

```text
Implementação concluída.

- responsabilidade X extraída para Y;
- contrato anterior preservado;
- E2E adicionado.

Validações: build, N testes e M E2E aprovados.

Teste manual:
1. ...
2. ...

Não há migração nem sincronização de view.

Commit sugerido:
feat(setor): descrição objetiva
```

Quando o usuário pedir apenas status ou resumo, não repetir todos os detalhes: responder com a lista simples de etapas.

## 14. Histórico concluído

### Etapa priorizada 1 — briefing do cliente: concluída, 8/8

- rascunho textual isolado;
- arquivos no IndexedDB isolados;
- correção da ordem/nome dos anexos restaurados;
- coleta de respostas isolada;
- submissão isolada;
- mapper e fábrica de páginas;
- opções simples, botões, cartões visuais e manutenção componentizados;
- controller reduzido à coordenação;
- testes unitários e E2E.

### Etapa priorizada 2 — módulos administrativos: concluída, 4/4

- `AdminHomeModule`;
- `AdminClientsModule`;
- `AdminClientManagementModule`;
- `AdminClientFinancialModule`;
- `AdminShellModule`;
- agregador administrativo reduzido a composição, roteamento e fluxo residual de criação.

### Etapa priorizada 3 — infraestrutura HTTP frontend: concluída, 4/4

- `HttpClient`, `HttpError`, sessão e logout compartilhados;
- APIs financeiras por recurso;
- APIs de propostas por área;
- APIs de clientes e views;
- fachadas sem `fetch` direto;
- gateways pequenos nos módulos;
- contratos e E2E.

### Funcionalidades e correções importantes já entregues

- anexos do cliente em aprovação e solicitação de alteração;
- separação de pastas de anexos de administrador e cliente no Drive;
- migração explícita para pastas legadas de propostas;
- remoção de anexos administrativos com compensação;
- automação de etapas por interação com propostas;
- status concluído e progresso verde;
- comentários na aprovação e solicitação de alteração;
- confirmação de consumo de rodada;
- paginação e segurança do financeiro;
- restauração de rota após F5;
- permissões de leitura do Drive pelos e-mails do briefing;
- remoção do worker separado de relatório: manter geração no processo principal por enquanto;
- prioridade IPv4 para integrações externas devido a timeouts com Google na VPS;
- substituição Mongoose de `{ new: true }` por `returnDocument: "after"`;
- `robots.txt`, favicon e `noindex` nas áreas privadas;
- diagrama em `dev/agent-relatories/2026-09-14-diagrama-arquitetura-sistema.png`.

## 15. Próximas etapas, em ordem

As cinco primeiras prioridades estão concluídas. A fila restante priorizada por legibilidade e componentização é:

### Etapa priorizada 4 — controllers HTTP do backend: concluída

Objetivo:

- criar ou consolidar adaptadores de rotas assíncronas;
- centralizar tradução de `ApplicationError`;
- dividir controllers grandes por capacidade;
- deixar controllers apenas com parsing HTTP, chamada do caso de uso e resposta;
- retirar regras, persistência, compensações e integrações dos controllers;
- preservar contratos e ampliar testes HTTP/E2E.

Primeiro recorte concluído em 15/09/2026: endpoints financeiros extraídos para `AdminPaymentsController` e `ClientPaymentsController`, com dependências recebidas pela composição. `asyncRoute` encaminha falhas ao middleware central, que traduz `ApplicationError` e preserva as mensagens financeiras legadas. Autenticação, rate limits, paginação, auditoria e contratos HTTP foram preservados; testes HTTP e E2E ampliados.

Segundo recorte concluído em 15/09/2026: propostas administrativas, relatórios e aprovações do cliente extraídos para `AdminProposalsController`, `AdminReportsController` e `ClientApprovalsController`. `ListClientApprovalsService` concentra consulta e normalização das etapas; `presentClientProposal` centraliza a saída pública com leitura de anexos legados. As políticas de erro distinguem `ValidationError` e `CastError` para manter os status anteriores de cada recurso. Uploads, histórico e compensações permanecem nos componentes existentes. Próximo recorte: clientes e sessões; depois, briefing e views.

Terceiro recorte concluído em 16/09/2026: operações administrativas de clientes e etapas foram extraídas para `AdminClientsController`; autenticação, consulta e encerramento de sessão foram separadas em `AdminSessionsController` e `ClientSessionsController`. `AdminController` foi removido e `ClientController` ficou restrito ao envio do briefing. Rotas usam `asyncRoute` e políticas de erro específicas, mantendo autenticação, rate limits e contratos HTTP. Próximo recorte: briefing e views do backend.

Quarto recorte concluído em 16/09/2026: envio do briefing extraído para `ClientBriefingController`; views separadas em `AdminViewsController` e `ClientViewsController`. Os agregadores `ClientController` e `ViewController` foram removidos. Upload multipart, identificação do cliente, payloads das views e mensagens HTTP foram preservados por meio de `asyncRoute`. A Etapa 4 está concluída. Próxima etapa: briefing administrativo e criação de cliente.

### Etapa priorizada 5 — briefing administrativo e criação de cliente: concluída

Estado: em andamento. Primeiro recorte iniciado em 16/09/2026: o carregamento das views do briefing administrativo saiu do controller e passou para `AdminViewsApi`, usando `HttpClient` e sessão injetada. `ClientCreationFlow` continua como orquestrador e as views persistidas e o payload permanecem inalterados.

Segundo recorte concluído em 16/09/2026: `AdminBriefingNavigator` passou a controlar breadcrumbs, avanços, retornos, adição de cômodos e confirmação final. O controller mantém por enquanto o estado e a edição dos campos, sem conhecer rotas administrativas. Próximo recorte: separar os editores de residência, investimento e cômodos.

Terceiro recorte concluído em 16/09/2026: `AdminBriefingDetailsEditor` passou a restaurar, sincronizar, normalizar e validar os campos de `Dados do briefing`. O controller apenas obtém os elementos e conecta editor e navegador. Próximo recorte: editor de investimento.

Quarto recorte concluído em 16/09/2026: `AdminBriefingInvestmentEditor` passou a restaurar e sincronizar a opção de flexibilidade do investimento. Próximo recorte: editor de cômodos.

Quinto recorte concluído em 16/09/2026: `AdminBriefingRoomsEditor` passou a controlar criação, restauração, personalização, exclusão, reordenação e sincronização dos cômodos. O controller administrativo do briefing ficou restrito à composição dos editores e do navegador. Próximo recorte: submissão da criação do cliente.

Sexto recorte concluído em 16/09/2026: `ClientCreationSubmission` passou a controlar o envio final, impedir duplicidade, desativar a confirmação, reativá-la após falha e navegar após sucesso. Próximo recorte: simplificação final do `ClientCreationFlow`.

Sétimo recorte concluído em 16/09/2026: o wrapper legado `newClient` foi removido. `ClientCreationDraft` concentra credenciais e montagem do payload; `ClientCreationFlow` coordena diretamente rascunho, `AdminBriefingController`, navegação, confirmação e submissão. A Etapa 5 está concluída. Próxima etapa: integrações Google Drive.

Organização estrutural concluída em 16/09/2026: os arquivos de `frontend/src/admin/modules` foram agrupados por escopo. `system/` contém shell, home e composição; `clients/` contém listagem, gestão, propostas e financeiro; `client-creation/` contém fluxo, rascunho e submissão; `client-creation/briefing/` contém os editores do briefing. A mudança não altera comportamento, contratos, views ou dados persistidos.

Ajuste funcional em 16/09/2026: nas páginas `Dados do briefing` e `Cômodos do briefing`, o botão secundário deve exibir `Voltar`. Em `Dados do briefing`, ele retorna ao formulário `Dados do cliente`; em `Cômodos do briefing`, retorna para investimento. Os textos pertencem às views persistidas correspondentes.

Ao voltar do briefing para `Dados do cliente`, nome, login e senha são preservados em memória, junto do briefing já editado. O rascunho é descartado ao retornar à listagem de clientes; portanto, acessar `Novo cliente` pela listagem sempre abre campos vazios.

Na página `Revisar e finalizar`, o botão `Voltar` retorna para `Cômodos do briefing`, preservando o rascunho do fluxo.

- dividir o fluxo por passo;
- separar estado, validação e transformação;
- reduzir `ClientCreationFlow` e controllers relacionados;
- preservar views persistidas e payload atual.

### Etapa priorizada 6 — integrações Google Drive

Estado: em andamento. Primeiro recorte concluído em 17/09/2026: `GoogleDriveClientProvider` centraliza credenciais OAuth, agente HTTPS IPv4 e criação do cliente oficial. O provider compartilha uma única instância durante o processo; `createDriveClient` permanece temporariamente como fachada compatível para os storages ainda não migrados. Próximo recorte: extrair permissões de pasta.

- cliente Google de baixo nível;
- storage de pastas;
- anexos de briefing;
- anexos de propostas;
- permissões;
- operações de lixeira/restauração;
- portas pequenas e compensações testadas.

### Etapa priorizada 7 — geração de relatório

- separar montagem de dados, renderização e Drive;
- manter o PDF no processo principal por decisão atual;
- não reintroduzir worker permanente sem justificar custo, estabilidade e operação na VPS.

### Etapa priorizada 8 — CSS das telas complexas

- reduzir CSS global;
- organizar por tela/componente;
- preservar aparência e responsividade;
- cobrir mudanças visuais relevantes por E2E.

### Etapa priorizada 9 — aplicação do cliente fora do briefing

- componentizar shell, home, etapas/aprovações e financeiro residual;
- reduzir `ClientSystemModules` a composição e roteamento.

### Etapa priorizada 10 — persistência e listagens

- portas mínimas;
- paginação de clientes e propostas;
- compatibilidade legada;
- concorrência e transações onde necessário;
- atenção máxima aos pagamentos reais.

### Etapa priorizada 11 — portfólio público

- separar navegação, carregamento e renderização;
- revisar estrutura de diretórios real do `portfolio`;
- melhorar leitura sem introduzir framework novo.

Itens de governança posteriores:

- versionar contratos das views;
- separar credenciais de leitura e sincronização das views;
- planejar migração compatível dos valores legados `beated` e `Cancelled`;
- elevar gradualmente a strictness do TypeScript.

## 16. Operação e VPS

- Backend é mantido por PM2.
- O frontend deve ser servido como artefato estático; idealmente pelo Nginx.
- `/api` deve ser encaminhado ao backend.
- Requisições como `/ip` são normalmente scanners externos. Não criar rotas aleatórias para satisfazê-las.
- `robots.txt` e favicon existem no frontend público.
- 404 de arquivos inexistentes não deveria ser registrado como erro fatal; corrigir o servidor estático em vez de silenciar todo o `stderr`.
- O Google OAuth apresentou `ETIMEDOUT` na VPS; a conectividade IPv4 funcionou e o backend passou a priorizá-la.
- Não assumir SSL, domínio, portas, caminhos de PM2 ou configuração Nginx sem inspecionar o ambiente atual.

Comandos comuns:

```bash
npm run dev:front
npm run dev:back
npm run build
npm test
npm run test:e2e
npm run deploy
```

O comando de deploy faz pull, instalação limpa, build e reinício do PM2. Confirmar alterações locais e configuração da VPS antes de executá-lo.

## 17. Cuidados especiais para novas conversas

- Nunca afirmar que uma etapa está adiada sem conferir o plano atual: a próxima etapa agora é controllers HTTP do backend.
- Não confundir as fases R1–R8 do relatório original com a ordem priorizada 1–11 adicionada posteriormente.
- O acompanhamento mais útil ao usuário usa a ordem priorizada.
- Antes de prosseguir para `próximo`, conferir o último estado no relatório e no Git.
- Não repetir uma implementação que já aparece commitada.
- Se o usuário fizer stash ou uma extensão alterar arquivos, verificar o diff e o commit antes de assumir que o trabalho continua presente.
- Preservar arquivos e mudanças do usuário que não pertencem ao recorte.
- Para dados reais, Drive, banco, migração, deploy ou ação destrutiva, validar alvos e autorização.
- Este arquivo deve ser atualizado quando surgir uma decisão duradoura que outra instância precise conhecer.

## 18. Referências essenciais

- `Architecture.md`: contrato arquitetural completo;
- `dev/agent-relatories/2026-09-12-plano-refatoracao-componentizacao.md`: plano e progresso;
- `dev/agent-relatories/2026-09-08-varredura-estrutural-arquitetura.md`: diagnóstico estrutural anterior;
- `dev/agent-relatories/2026-09-03-checkup-arquitetura.md`: histórico do checkup;
- `dev/database/`: referências versionadas das views;
- `dev/agent-relatories/2026-09-14-diagrama-arquitetura-sistema.png`: diagrama visual;
- `package.json`: comandos oficiais do workspace.

Este documento não substitui a inspeção do código. Ele existe para preservar intenção, padrões e sequência de trabalho entre dispositivos e instâncias de conversa.

## 19. Composição familiar do briefing

- A definição do briefing persiste `adultAmount` e `childrenAmount`; `residentAmount` foi descontinuado.
- O total de pessoas deve ser derivado em memória pela soma dos dois campos, sem persistência duplicada.
- Adultos geram nome, data de nascimento, altura em centímetros, telefone e e-mail. Crianças geram nome, data de nascimento e altura em centímetros.
- A idade não é persistida: é calculada pela data de nascimento no momento da geração do relatório.
- No relatório, respostas pessoais de `about-property` devem ser agrupadas pelos prefixos `adult-N-*` e `child-N-*`; cada pessoa possui bloco visual próprio antes das demais informações do imóvel.
- O ranking de três prioridades da página Rotina usa exclusivamente `preco`, `qualidade` e `tempo`; uma opção só pode ocupar uma posição por vez, e a seleção mais recente prevalece.
- A página de preferências de materiais possui uma matriz de acabamentos por superfície, com seleção única por linha: fosco, acetinado, cromado, polido ou sem preferência.
- No relatório, as escolhas `surface-finish-*` devem ser removidas da grade genérica e apresentadas em uma tabela própria de superfície e acabamento.
- A quantidade mínima é 1 adulto e 0 crianças.
- Dados legados devem ser migrados com `npm run briefing:migrate-resident-counts -- --apply`; execute antes sem `--apply` para visualizar o alcance.

## 20. Estado atual da refatoração do Google Drive

- A etapa priorizada 6 foi concluída, com 5 de 5 recortes finalizados.
- `GoogleDriveClientProvider` centraliza e reutiliza o cliente OAuth do processo.
- `GoogleDriveFolderPermissionStorage` é o adaptador exclusivo para consultar e criar permissões de leitura em pastas.
- `GoogleDriveProposalStorage` concentra uploads, hierarquia por autor/resposta, renomeação e descarte de anexos de propostas.
- `GoogleDriveBriefingStorage` concentra a hierarquia e os uploads dos anexos do briefing.
- `GoogleDriveBriefingReportStorage` concentra status, criação/substituição do PDF e download seguro de imagens para o relatório.
- `GoogleDriveClientFolderStorage` concentra criação e descarte/restauração da pasta raiz do cliente.
- `drive-folder` contém somente os helpers técnicos compartilhados de saneamento e criação idempotente de diretórios.
- A obtenção do cliente continua preguiçosa para não tornar o Google uma dependência do bootstrap do backend.
- As fachadas genéricas `GoogleDriveAttachmentStorage` e `googleDrive.ts` foram removidas; os serviços de aplicação dependem exclusivamente das portas específicas.
- A próxima etapa priorizada é a Etapa 7, geração de relatórios.

## 21. Estado atual da refatoração dos relatórios

- A etapa priorizada 7 está em andamento, com 3 de 5 recortes concluídos.
- Um snapshot semântico protege capa, capítulos, seções, pessoas, acabamentos e cômodos do HTML atual.
- O snapshot fica em `backend/test/fixtures/briefing-report-structure.snapshot.json` e deve ser alterado somente quando a mudança visual/estrutural for intencional.
- `briefing-report.mapper.ts` transforma documentos atuais, incompletos e com `residentAmount` legado em um view model estável.
- `briefing-report.template.ts` monta somente o HTML e `briefing-report.styles.ts` concentra o CSS do PDF.
- `briefing-report.ts` é uma fachada temporária para o renderer Puppeteer até o último recorte.
- Próximo recorte: extrair a resolução e preparação das imagens privadas.
