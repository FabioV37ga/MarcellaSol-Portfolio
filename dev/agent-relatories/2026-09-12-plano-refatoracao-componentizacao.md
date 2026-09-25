# Plano de refatoração e componentização — 12/09/2026

## 1. Objetivo

Este plano organiza a refatoração do sistema por setor e responsabilidade. O objetivo é reduzir arquivos multifuncionais, tornar dependências explícitas, facilitar testes e permitir evolução sem alterar contratos, dados reais ou comportamento visual inadvertidamente.

O trabalho será incremental. Cada recorte deve preservar uma fachada compatível enquanto consumidores são migrados, evitando uma reescrita completa.

## 2. Limites deste ciclo

Incluído:

- separação de responsabilidades;
- componentização por fluxo funcional;
- contratos internos explícitos;
- redução de duplicação;
- testes de caracterização e unidade;
- organização de arquivos e nomes;
- melhoria de legibilidade e navegabilidade;
- documentação das fronteiras arquiteturais.

Fora deste ciclo:

- worker separado para geração de PDF;
- outbox e reconciliação MongoDB/Google Drive;
- mudanças visuais extensas;
- alteração do formato dos dados existentes sem necessidade;
- migrações destrutivas;
- troca de framework;
- adoção de container de injeção de dependências;
- alteração manual das views em produção fora do fluxo já validado.

## 3. Regras para todas as refatorações

1. Não misturar refatoração estrutural com funcionalidade nova no mesmo recorte.
2. Preservar URLs, métodos HTTP, status e formatos de resposta durante a migração.
3. Preservar compatibilidade com documentos legados do MongoDB.
4. Manter as views de referência em `dev/database` como fonte editável das views persistidas.
5. Criar teste de caracterização antes de mover uma regra sem cobertura.
6. Evitar módulos genéricos chamados `helpers`, `utils` ou `common` quando houver um domínio claro.
7. Preferir dependências por interface e composição explícita.
8. Um arquivo deve possuir um motivo principal para mudar.
9. Cada recorte deve compilar, passar nos testes e possuir um fluxo manual curto.
10. Commits devem ser pequenos o suficiente para permitir reversão isolada.
11. Cada implementação deve adicionar ou ampliar ao menos um teste E2E que percorra o comportamento afetado pela interface.

## 4. Setor A — entrada HTTP do backend

### Responsabilidade desejada

Receber uma requisição, extrair dados, chamar um caso de uso e transformar o resultado em resposta HTTP. Controllers não devem conhecer persistência, Drive ou detalhes de geração de documentos.

### Problemas atuais

- `AdminController` agrega clientes, propostas, financeiro, relatórios, sessão e etapas.
- `ClientController` agrega autenticação, briefing, propostas, etapas e financeiro.
- tratamento de `ApplicationError` e erros inesperados é repetido;
- tradução de parâmetros de rota e autenticação é repetida;
- controllers grandes mudam por motivos independentes.

### Componentes propostos

- `async-route.ts`: encaminhamento uniforme de promises e exceções;
- `http-error-middleware.ts`: única tradução de erros conhecidos;
- `admin-session.controller.ts`;
- `admin-clients.controller.ts`;
- `admin-proposals.controller.ts`;
- `admin-payments.controller.ts`;
- `admin-reports.controller.ts`;
- `client-session.controller.ts`;
- `client-briefing.controller.ts`;
- `client-approvals.controller.ts`;
- `client-payments.controller.ts`.

### Estratégia

1. Caracterizar respostas HTTP atuais.
2. Criar o adaptador assíncrono e middleware central.
3. Extrair primeiro o financeiro, já bem coberto.
4. Extrair propostas e relatórios.
5. Extrair clientes e sessões.
6. Remover os controllers agregadores quando nenhuma rota depender deles.

### Critério de conclusão

- handlers sem `try/catch` repetitivo;
- controllers organizados por recurso;
- nenhum controller instancia dependências;
- erros conhecidos e inesperados possuem tradução uniforme;
- contratos HTTP permanecem compatíveis.

## 5. Setor B — casos de uso e domínio do backend

### Responsabilidade desejada

Casos de uso coordenam regras e portas. Regras puras permanecem em módulos de domínio ou aplicação sem Express, Mongoose ou Google APIs.

### Situação atual

O financeiro já foi dividido em cálculo, entrada, presenter, paginação e apresentação Pix. A composition root, o relógio e o gerador de IDs já existem. Outros fluxos ainda usam tipos concretos de repositories e serviços grandes.

### Componentes propostos

- portas mínimas por caso de uso, próximas ao consumidor;
- `proposal-stage-policy.ts`: regras de transição entre proposta e etapa, sem persistência;
- `briefing-submission-policy.ts`: normalização do envio e estado resultante;
- `client-removal-policy.ts`: validações puras anteriores à remoção;
- contratos explícitos de entrada e saída para cada caso de uso;
- fachadas de aplicação somente quando houver múltiplos consumidores legítimos.

### Estratégia

1. Identificar regras puras escondidas em serviços.
2. Extrair políticas sem alterar a ordem dos efeitos externos.
3. Trocar dependências concretas por interfaces mínimas.
4. Testar políticas sem MongoDB, Express ou Drive.
5. Manter orquestração nos serviços de aplicação.

### Critério de conclusão

- regras centrais testáveis em memória;
- casos de uso não importam Express;
- Mongoose fica restrito a models/repositories ou adaptadores inevitáveis;
- relógio e IDs não são acessados globalmente nas regras de negócio.

## 6. Setor C — persistência MongoDB

### Responsabilidade desejada

Repositories encapsulam queries, projeções e persistência. Models definem formato persistido e validações estruturais, sem controlar fluxo de aplicação.

### Problemas atuais

- alguns serviços dependem diretamente das classes concretas de repository;
- projeções e compatibilidade legada podem ficar espalhadas;
- paginação existe no financeiro, mas ainda não em clientes e propostas;
- tipos de documentos Mongoose atravessam algumas fronteiras.

### Componentes propostos

- interfaces de leitura e escrita por caso de uso;
- mapeadores entre documentos e objetos de aplicação quando necessário;
- projections administrativas específicas;
- módulo compartilhado de cursor opaco;
- repositories de clientes e propostas com paginação e busca.

### Estratégia

1. Extrair interfaces a partir do uso real, sem criar repositories genéricos.
2. Separar comandos de consultas quando o arquivo crescer por razões diferentes.
3. Reaproveitar o padrão de cursor financeiro.
4. Paginar clientes antes de propostas.
5. Adicionar índices apenas com consulta e cardinalidade justificadas.

### Critério de conclusão

- serviços não dependem de métodos que não utilizam;
- respostas HTTP não expõem documentos Mongoose;
- listagens potencialmente crescentes são paginadas;
- compatibilidade de documentos antigos permanece testada.

## 7. Setor D — integrações Google Drive

### Responsabilidade desejada

Um adaptador de baixo nível comunica-se com a API do Google; serviços especializados definem operações de negócio sobre pastas, anexos, permissões e relatórios.

### Problemas atuais

- `googleDrive.ts` concentra autenticação, pastas, upload, download, permissões e lixeira;
- `GoogleDriveAttachmentStorage` implementa muitas interfaces não relacionadas;
- alterações em uma operação podem afetar imports de vários fluxos;
- mensagens e tratamento de falhas são parcialmente compartilhados.

### Componentes propostos

- `google-drive-client.ts`: autenticação e criação do cliente oficial;
- `drive-folder.storage.ts`: criação, rename, lixeira e restauração;
- `briefing-attachment.storage.ts`;
- `proposal-attachment.storage.ts`;
- `briefing-report.storage.ts`;
- `folder-permission.storage.ts`;
- normalizador comum de erros da API do Google.

### Estratégia

1. Criar um cliente Google compartilhado sem mudar chamadas.
2. Extrair permissões de pasta.
3. Extrair anexos de proposta.
4. Extrair briefing e relatório.
5. Remover a fachada ampla somente após migrar consumidores.

### Critério de conclusão

- cada adaptador implementa uma responsabilidade principal;
- autenticação Google não é recriada por operação;
- testes de aplicação usam portas pequenas;
- política de IPv4 e timeout permanece centralizada.

Observação: consistência distribuída, outbox e reconciliação pertencem a outro ciclo e continuam adiadas.

## 8. Setor E — geração de relatório de briefing

### Responsabilidade desejada

Separar transformação dos dados, montagem do documento, resolução de imagens e renderização PDF, mantendo o processamento no backend principal.

### Problemas atuais

- `briefing-report.ts` reúne transformação, HTML, CSS, assets e Puppeteer;
- o serviço de relatório também prepara imagens e coordena armazenamento;
- testar conteúdo exige atravessar detalhes de renderização.

### Componentes propostos

- `briefing-report.mapper.ts`: dados persistidos para view model;
- `briefing-report.template.ts`: HTML a partir da view model;
- `briefing-report.styles.ts` ou asset CSS dedicado;
- `report-image-resolver.ts`: download e preparação das imagens;
- `pdf-renderer.ts`: porta e implementação Puppeteer;
- `client-briefing-report.service.ts`: somente orquestração.

### Estratégia

1. Criar snapshot estrutural do HTML atual.
2. Extrair o mapper e testar entradas incompletas/legadas.
3. Extrair template e estilos.
4. Encapsular Puppeteer em uma porta.
5. Preservar fila em memória, concorrência 1 e execução no processo principal.

### Critério de conclusão

- conteúdo pode ser testado sem iniciar Chromium;
- renderer recebe HTML pronto;
- imagens possuem etapa própria;
- relatório produzido mantém conteúdo e aparência esperados.

## 9. Setor F — infraestrutura HTTP do frontend

### Responsabilidade desejada

Um cliente HTTP compartilhado controla URL base, autenticação, JSON, erros e sessão. APIs por recurso descrevem endpoints e contratos específicos.

### Problemas atuais

- `admin-system.api.ts` concentra todos os endpoints administrativos;
- lógica de `fetch`, headers e erros se repete entre administrador e cliente;
- módulos de tela conhecem detalhes de transporte;
- assertions de tipos ainda existem fora dos contratos runtime já cobertos.

### Componentes propostos

- `shared/http/http-client.ts`;
- `shared/http/http-error.ts`;
- `admin/infrastructure/clients.api.ts`;
- `admin/infrastructure/proposals.api.ts`;
- `admin/infrastructure/payments.api.ts`;
- `admin/infrastructure/reports.api.ts`;
- `admin/infrastructure/views.api.ts`;
- equivalentes do cliente somente quando houver mais de uma responsabilidade;
- fachada temporária `AdminSystemApi` delegando às APIs novas.

### Estratégia

1. Caracterizar autenticação e mensagens de erro.
2. Extrair cliente HTTP compartilhado.
3. Migrar financeiro.
4. Migrar propostas e clientes.
5. Migrar views e relatórios.
6. Remover a fachada quando não possuir consumidores.

### Critério de conclusão

- nenhum módulo de UI monta header de autenticação;
- parsing e erro HTTP são uniformes;
- APIs estão divididas por recurso;
- validação runtime ocorre na fronteira adequada.

## 10. Setor G — aplicação administrativa

### Responsabilidade desejada

Cada módulo administrativo controla uma tela ou fluxo. O router seleciona módulos, mas não implementa regras da tela.

### Problemas atuais

- `admin-system.modules.ts` agrega home, clientes, gestão, relatório, financeiro e criação;
- `client-financial-manager.ts` mistura formulário, prévia, lista, mutações e diálogo;
- `project-stage-editor.ts` reúne renderização, seleção, drag-and-drop e persistência;
- propostas possuem renderização e edição concentradas.

### Componentes propostos

- `AdminHomeModule`;
- `AdminClientsModule`;
- `AdminClientManagementModule`;
- `AdminReportModule`;
- `ClientFinancialList`;
- `ClientFinancialForm`;
- `ClientFinancialActions`;
- `ProjectStageStatusEditor`;
- `ProjectStageOrderEditor`;
- `ProposalList`, `ProposalEditor` e `ProposalAttachmentManager`.

### Estratégia

1. Extrair módulos simples de `AdminSystemModules`.
2. Dividir o financeiro por estado e interação.
3. Dividir editor de etapa/status e editor de ordem.
4. Dividir propostas por lista, formulário e anexos.
5. Manter selectors centralizados por view, sem consultas duplicadas espalhadas.

### Critério de conclusão

- um módulo corresponde a uma tela ou fluxo;
- componentes recebem elementos/dependências, sem buscar globais por conta própria;
- listeners são removidos no descarte da view;
- estado de formulário não fica misturado ao estado de navegação.

## 11. Setor H — briefing do cliente

### Responsabilidade desejada

O controller coordena navegação. Rascunho, arquivos, regras, coleta e envio pertencem a componentes independentes.

### Problemas atuais

- `briefing.controller.ts` possui aproximadamente 741 linhas;
- rascunho, IndexedDB, navegação, validação e submissão estão acoplados;
- respostas podem depender da posição visual do campo;
- templates extensos misturam conteúdo e marcação repetitiva.

### Componentes propostos

- `BriefingDraftService`;
- `BriefingFileDraftService`;
- `BriefingAnswerCollector`;
- `BriefingSubmissionFlow`;
- `BriefingPageNavigator` como coordenador de páginas;
- identificadores estáveis `answerKey` definidos na view/template;
- factories pequenas para grupos repetidos de preferências.

### Estratégia

1. Criar testes de restauração do rascunho atual.
2. Introduzir `answerKey` estável mantendo leitura do formato antigo.
3. Extrair armazenamento textual.
4. Extrair armazenamento de arquivos.
5. Extrair coleta e montagem do payload.
6. Extrair submissão e tratamento de resultado.
7. Reduzir o controller à coordenação.
8. Componentizar templates repetitivos sem alterar o conteúdo.

### Critério de conclusão

- reordenar campos não associa respostas ao campo errado;
- armazenamento pode ser testado sem montar o briefing inteiro;
- envio possui um único montador de payload;
- controller deixa de conhecer detalhes de IndexedDB;
- views do banco permanecem como base da interface.

## 12. Setor I — briefing administrativo e criação de cliente

### Responsabilidade desejada

Separar criação do cliente, edição do briefing-base, navegação entre páginas e finalização.

### Problemas atuais

- controller administrativo do briefing concentra montagem e interação;
- fluxo de criação atravessa módulos, selectors e templates diferentes;
- parte das regras se aproxima das regras do briefing do cliente, mas não possui fronteira compartilhada clara.

### Componentes propostos

- `ClientCreationFlow` como orquestrador;
- `AdminBriefingNavigator`;
- `AdminBriefingEditor`;
- `RoomEditor`;
- `InvestmentEditor`;
- `ClientCreationSubmission`;
- regras realmente comuns em `shared/briefing`, sem compartilhar comportamento específico de papel.

### Critério de conclusão

- cada passo pode ser testado isoladamente;
- navegação não contém montagem do payload;
- regras compartilhadas possuem um único dono;
- criação existente continua compatível com as views do banco.

## 13. Setor J — aplicação do cliente fora do briefing

### Responsabilidade desejada

Separar home, aprovações, financeiro, sessão e navegação.

### Componentes propostos

- `ClientHomeModule`;
- `ClientApprovalsModule`;
- `ClientFinancialModule` já existente, dividido somente quando houver benefício concreto;
- diálogos de aprovação e solicitação de alteração como componentes;
- presenter compartilhado de etapas, sem regras duplicadas entre admin e cliente.

### Critério de conclusão

- aprovação e solicitação de alteração não dependem do módulo inteiro da aplicação;
- diálogos possuem ciclo de vida explícito;
- apresentação de etapas usa contratos compartilhados;
- restauração de rota após recarregar continua funcionando.

## 14. Setor K — portfólio público

### Estado

**Aguardando descrição de arquitetura.**

A arquitetura, a experiência de uso, as responsabilidades e a estratégia de implementação desta área ainda serão definidas pelo responsável do projeto. As propostas anteriores para navegação, carregamento, renderização, componentes visuais e animações foram retiradas do planejamento.

Até que uma nova descrição seja fornecida:

- não iniciar refatoração ou componentização do portfólio público;
- não presumir módulos, fluxos, contratos ou estrutura de diretórios futuros;
- preservar o funcionamento atual em alterações feitas nas demais áreas;
- elaborar um novo planejamento somente depois da definição de arquitetura e usabilidade pelo responsável do projeto.

## 15. Setor L — views persistidas no banco

### Responsabilidade desejada

As views continuam sendo a fonte da estrutura visual dinâmica, com contrato explícito entre HTML persistido e TypeScript.

### Melhorias propostas

- catálogo tipado de `viewName`, IDs e classes obrigatórias;
- selectors agrupados por view;
- teste de compatibilidade entre referência em `dev/database` e consumidor;
- revisão de `schemaVersion` e `revision` em ciclo posterior;
- componentes TypeScript devem reutilizar elementos existentes na view, evitando construir telas inteiras via DOM.

### Critério de conclusão

- toda dependência estrutural de uma view é validada antes da sincronização;
- alterações visuais começam na referência em `dev/database`;
- TypeScript controla comportamento, não recria a marcação integral;
- falhas de contrato indicam claramente a view e o selector ausente.

## 16. Setor M — CSS e organização visual

### Responsabilidade desejada

Separar tokens, layout, componentes e ajustes responsivos sem transformar CSS em um conjunto de regras globais difíceis de rastrear.

### Problemas atuais

- arquivos de propostas, financeiro e briefing cresceram junto com as funcionalidades;
- admin e cliente repetem resets e padrões de componentes;
- seletores muito específicos dificultam reutilização;
- formatação em massa pode gerar diffs grandes sem ganho funcional.

### Componentes propostos

- tokens compartilhados de cor, tipografia, espaçamento e borda;
- componentes de botão, diálogo, feedback, cartão e paginação;
- arquivos de layout por página;
- arquivos responsivos próximos ao componente correspondente;
- reset único compartilhado quando a equivalência for confirmada.

### Estratégia

1. Inventariar valores repetidos, sem substituir automaticamente.
2. Extrair tokens comprovadamente iguais.
3. Extrair componentes visuais usados em pelo menos duas telas.
4. Dividir CSS grande por componente mantendo ordem de importação.
5. Fazer comparação visual desktop e mobile a cada recorte.

### Critério de conclusão

- arquivos refletem componentes reconhecíveis;
- tokens não alteram valores existentes;
- especificidade não aumenta como solução padrão;
- admin e cliente compartilham apenas estilos realmente equivalentes.

## 17. Setor N — testes, qualidade e documentação

### Responsabilidade desejada

Garantir que a mudança estrutural seja verificável sem depender somente de testes manuais.

### Melhorias propostas

- factories tipadas para casos de uso e controllers em testes;
- relógio e IDs fixos nos testes que dependem de tempo;
- testes HTTP por recurso;
- testes de ciclo de vida dos módulos de frontend;
- testes de contrato das views;
- snapshots estruturais apenas para documentos estáveis;
- documentação curta de responsabilidade em diretórios centrais.

### Critério de conclusão

- doubles não dependem de argumentos omitidos implicitamente;
- testes indicam o setor responsável quando falham;
- build e testes completos continuam sendo executáveis localmente;
- cada etapa possui checklist manual documentado.

## 18. Ordem geral de execução

### Fase R1 — fronteira HTTP do backend

Setores: A e N.

Resultado: controllers menores e tratamento uniforme de erros.

### Fase R2 — infraestrutura HTTP do frontend

Setores: F e N.

Resultado: cliente HTTP compartilhado e APIs divididas por recurso.

### Fase R3 — módulos administrativos

Setores: G e L.

Resultado: módulos de tela independentes, preservando as views persistidas.

### Fase R4 — briefing do cliente

Setores: H, L e N.

Resultado: rascunho, arquivos, respostas e submissão separados.

### Fase R5 — briefing administrativo

Setores: I e L.

Resultado: criação de cliente e edição de briefing divididas por passo.

### Fase R6 — Drive e relatório

Setores: D e E.

Resultado: integrações técnicas menores, mantendo PDF no processo principal.

### Fase R7 — persistência e listagens

Setores: B e C.

Resultado: portas mínimas e paginação de clientes/propostas.

### Fase R8 — cliente, portfólio e CSS

Setores: J, K e M.

Resultado: componentização das telas restantes e consolidação visual controlada.

## 19. Quantidade e acompanhamento

O plano possui 8 fases e 14 setores de responsabilidade. Cada fase deve ser dividida em commits menores; fase não equivale necessariamente a um único commit.

Estados de acompanhamento:

- `pendente`: ainda não iniciado;
- `em andamento`: possui recorte no working tree ou parcialmente entregue;
- `resolvido`: critérios de conclusão atendidos;
- `adiado`: removido da sequência atual sem ser descartado definitivamente.

Estado inicial em 12/09/2026:

| Fase | Estado |
|---|---|
| R1 — fronteira HTTP do backend | pendente |
| R2 — infraestrutura HTTP do frontend | pendente |
| R3 — módulos administrativos | em andamento |
| R4 — briefing do cliente | resolvido |
| R5 — briefing administrativo | pendente |
| R6 — Drive e relatório | pendente |
| R7 — persistência e listagens | pendente |
| R8 — cliente, portfólio e CSS | pendente |

## 20. Checklist obrigatório por recorte

- [ ] comportamento e contrato preservados;
- [ ] nenhuma alteração acidental em dados reais;
- [ ] build do projeto afetado;
- [ ] testes automatizados proporcionais ao risco;
- [ ] teste E2E adicionado ou ampliado para cobrir o comportamento afetado;
- [ ] `git diff --check` sem erros;
- [ ] inspeção de arquivos inesperados no diff;
- [ ] fluxo de teste manual entregue ao final;
- [ ] sugestão de texto de commit entregue ao final;
- [ ] estado da fase atualizado neste documento.

## 21. Primeiro passo recomendado

Iniciar pela Fase R1 com um recorte pequeno: criar o adaptador de rota assíncrona e centralizar a tradução de `ApplicationError`, aplicando primeiro aos endpoints financeiros. Esse setor já possui boa cobertura HTTP e oferece menor risco para estabelecer o padrão que será usado nos demais controllers.

## 22. Ordem priorizada por impacto em legibilidade e componentização

Quando o critério principal for reduzir concentração de responsabilidades e facilitar a leitura cotidiana do código, a execução deve seguir esta prioridade:

1. Briefing do cliente;
2. módulos administrativos;
3. infraestrutura HTTP do frontend;
4. controllers HTTP do backend;
5. briefing administrativo e criação de cliente;
6. integrações Google Drive;
7. geração do relatório de briefing;
8. CSS das telas complexas;
9. aplicação do cliente fora do briefing;
10. persistência e listagens;
11. portfólio público — aguardando descrição de arquitetura;
12. persistência visual — concluída em sete recortes.

### Execução da Etapa priorizada 10 — persistência e listagens

Estado em 24/09/2026: **Etapa 10 concluída (5/5)**.

- O primeiro recorte restringiu `ListClientsService` às portas mínimas de listagem de clientes e briefings.
- O segundo recorte implementou paginação por cursor opaco na listagem administrativa de clientes, ordenada por `_id` decrescente, com 20 itens por padrão e máximo de 50.
- A consulta usa o índice nativo de `_id`, busca um registro excedente para detectar continuação e consulta briefings apenas para os clientes da página atual.
- A interface acrescenta páginas pelo botão `Carregar mais`, mantém os itens existentes e deduplica registros por `client.id`.
- A referência `dev/database/admin-clients-view.json` foi atualizada e deve substituir/sincronizar a view persistida antes do teste em produção.
- O terceiro recorte paginou propostas no fluxo administrativo e aprovações no fluxo do cliente com cursor opaco composto por `updatedAt` e `_id`.
- A ordem anterior por atualização foi preservada; `_id` atua como desempate determinístico quando duas propostas possuem o mesmo horário.
- Ambas as telas acrescentam itens sem duplicação e mantêm etapas, mutações, anexos e decisões nos contratos existentes.
- As referências `dev/database/client-proposals-view.json` e `dev/database/client-stages-approvals-view.json` foram atualizadas e precisam ser sincronizadas/substituídas no banco.
- O quarto recorte confirmou a compatibilidade financeira legada: versões ausentes continuam equivalentes à versão zero e respostas públicas continuam omitindo campos administrativos.
- As mutações permanecem protegidas por versão, cliente, transação e auditoria atômica; nenhum pagamento real foi alterado para validar o recorte.
- O frontend administrativo agora reconhece o conflito de concorrência 409 pelo código estável `PAYMENT_VERSION_CONFLICT`, descarta o estado obsoleto e recarrega a primeira página antes de permitir nova ação.
- Conflitos funcionais distintos, como bloqueio de condições após recebimento e confirmação reforçada de remoção, não são confundidos com concorrência.
- Nenhum pagamento ou outro dado real foi escrito, migrado ou recalculado.
- A revisão final eliminou a leitura financeira legada sem limite: listagens agora dependem obrigatoriamente de página limitada, resumo agregado e consulta limitada do destaque.
- O contrato dessas três leituras foi isolado em `PaymentListingRepository`; o repositório MongoDB continua como adaptador concreto e as mutações financeiras permanecem inalteradas.
- A cobertura E2E administrativa verifica que a segunda página financeira é acrescentada sem remover pagamentos já visíveis; conforme o padrão vigente, o E2E não foi executado automaticamente.
- Não houve escrita, migração ou recálculo de pagamentos reais, nem mudança adicional em views persistidas.
- A Etapa 11 permanece aguardando a descrição de arquitetura do portfólio público. A Etapa 12 foi concluída em sete recortes.

Fluxo resumido:

```text
Briefing do cliente
→ módulos administrativos
→ infraestrutura HTTP do frontend
→ controllers do backend
→ briefing administrativo
→ Google Drive
→ relatório
→ CSS
→ módulos restantes do cliente
→ persistência
→ portfólio público (aguardando descrição de arquitetura)
→ persistência visual
```

### Primeiro recorte desta ordem

Começar pelo briefing do cliente, extraindo o armazenamento do rascunho textual de `briefing.controller.ts`. O recorte deve preservar o formato atual do rascunho e do payload enviado, sem alterar as views persistidas. Em seguida, introduzir identificadores estáveis para respostas com leitura compatível do formato legado antes de separar arquivos, coleta e submissão.

Estado em 12/09/2026: **segundo recorte concluído**. A captura, persistência, restauração e remoção do rascunho textual foram concentradas em `BriefingDraftService`. Rascunhos novos registram uma chave estável derivada de `data-briefing-answer-key`, `id` ou `name`, enquanto o formato legado por `pageKey + fieldIndex` continua sendo lido. Campos com chave removida não restauram por posição, evitando associar a resposta a outro controle após uma alteração de tela. O próximo recorte separará o armazenamento dos arquivos do briefing.

Correção complementar em 12/09/2026: o multipart de anexos passou a usar nomes técnicos ASCII e determinísticos para validar a ordem de transporte. O nome original permanece no manifesto e é restaurado no backend antes do envio ao Drive. Isso evita divergências de nome após restaurar arquivos do IndexedDB, especialmente com espaços, acentos ou normalizações diferentes do navegador.

Estado em 12/09/2026: **terceiro recorte concluído**. Cache em memória, persistência no IndexedDB, restauração, deduplicação, limite por campo, feedback visual, sincronização de gravações e limpeza dos arquivos foram extraídos para `BriefingFileDraftService`. O controller passou a apenas inicializar o componente, encaminhar mudanças de campos e consultar os arquivos associados ao montar a resposta. O próximo recorte extrairá a coleta das respostas do formulário.

Estado em 12/09/2026: **quarto recorte concluído**. A leitura dos controles, interpretação de valores, agrupamento de radio/checkbox, associação de arquivos, extração das perguntas e organização de seções e ambientes foram movidas para `BriefingAnswerCollector`. A estrutura `CompletedBriefing` e os identificadores de upload foram preservados. O próximo recorte extrairá a montagem dos anexos e o fluxo de submissão.

Estado em 12/09/2026: **quinto recorte concluído**. A espera pelas gravações pendentes, coleta do payload, montagem do manifesto de anexos, chamada da API e limpeza dos rascunhos após sucesso foram concentradas em `BriefingSubmissionFlow`. Falhas de envio preservam os dados locais para nova tentativa. O próximo recorte reduzirá o controller à coordenação, removendo fachadas e responsabilidades residuais que não forem mais necessárias.

Estado em 12/09/2026: **sexto recorte concluído**. Normalização da resposta do briefing foi movida para `briefing-data.mapper.ts`, enquanto seleção de templates, composição, ordenação e identificação das páginas e ambientes passaram para `BriefingPageFactory`. O controller deixou de conhecer templates específicos e regras de montagem das páginas. O próximo recorte componentizará grupos repetidos dos templates sem alterar seu conteúdo ou aparência.

Estado em 12/09/2026: **sétimo recorte em andamento**. Opções com aparência de botão passaram a ser geradas por `briefingButtonOptions`, preservando `type`, `name`, `value`, texto e classe estrutural. O primeiro recorte migrou os grupos de investimento e prioridades; os templates extensos de preferências e ambientes serão migrados incrementalmente para evitar alterações visuais amplas.

Continuação do sétimo recorte: opções simples sem mídia passaram a usar `briefingSimpleOptions`. Os grupos de atenção visual e adjetivos da casa dos sonhos foram migrados, removendo marcação repetida sem misturar o contrato dos cartões com imagens. Limites de seleção e identificadores dos campos permanecem cobertos por E2E.

Continuação do sétimo recorte: cartões de atmosfera, paleta, madeira e formas passaram a usar `briefingVisualOptions`. O componente preserva a ordem estrutural de input, imagem, badge, título ou legenda e não cria nós de texto ausentes. Quantidades, acessibilidade das imagens, seleção e limites estão cobertos por E2E. Permanecem os cartões de elementos e manutenção antes da revisão final da fase.

Estado em 12/09/2026: **oitavo recorte concluído e Fase R4 resolvida**. Cartões de elementos foram incorporados a `briefingVisualOptions` com suporte à classe específica dos ícones, e manutenção passou a usar opções descritivas reutilizáveis. A revisão final removeu campos privados e o carregador de stylesheet comentado sem função do controller. Rascunho, arquivos, respostas, submissão, navegação, montagem e componentes de opções possuem responsabilidades separadas e cobertura unitária e E2E. Etapa priorizada 1: **8/8 concluída**.

## 23. Execução da Etapa priorizada 2 — módulos administrativos

Estado em 14/09/2026: **primeiro recorte concluído**. A montagem da página inicial administrativa e o acesso rápido aos clientes foram extraídos de `AdminSystemModules` para `AdminHomeModule`. O componente recebe a view persistida, a ação de navegação e o item de navegação como dependências, mantendo o agregador somente como roteador temporário. Etapa priorizada 2: **1/4 concluída**. O próximo recorte separará a listagem e as ações de clientes.

Estado em 14/09/2026: **segundo recorte concluído**. Carregamento da listagem, renderização, navegação por clique e teclado e confirmação nominal de exclusão foram movidos para `AdminClientsModule`. O HTML continua vindo de `admin-clients-view.json`, e o módulo recebe API, sessão e ações de navegação como dependências. Etapa priorizada 2: **2/4 concluída**. O próximo recorte separará a gestão e o relatório individual do cliente.

Estado em 14/09/2026: **terceiro recorte concluído**. Carregamento da gestão individual, navegação para propostas e financeiro, disponibilidade da pasta do Drive e estados de consulta, geração, acesso e nova tentativa do relatório foram movidos para `AdminClientManagementModule`. Requisições obsoletas continuam invalidadas no descarte da view. Etapa priorizada 2: **3/4 concluída**. O último recorte separará financeiro e shell/navegação residual, concluindo a revisão do agregador.

Estado em 14/09/2026: **quarto recorte concluído**. O carregamento financeiro individual e o ciclo de vida de `ClientFinancialManager` foram movidos para `AdminClientFinancialModule`; renderização da base, navegação desktop e móvel e logout passaram para `AdminShellModule`. `AdminSystemModules` ficou limitado à composição, roteamento e ao fluxo de criação de cliente que será tratado em sua etapa específica. As views persistidas e os contratos de navegação foram preservados. Etapa priorizada 2: **4/4 concluída**.

Implementação complementar em 14/09/2026: anexos opcionais nas respostas de propostas foram incorporados ao padrão arquitetural. Diálogos, validação, coleta de arquivos, submissão e atualização visual ficaram em `ClientProposalResponseModule`; persistência do histórico, sincronização de etapa e compensação de falhas ficaram em `ClientProposalResponseService`; operações específicas de diretórios e arquivos de propostas foram isoladas em `proposal-drive.storage.ts`. O fluxo permanece coberto por teste de domínio e E2E multipart.

## 24. Execução da Etapa priorizada 3 — infraestrutura HTTP do frontend

Estado em 14/09/2026: **primeiro recorte concluído**. URL base, autenticação Bearer, JSON, respostas vazias e tradução uniforme de erros foram concentrados em `HttpClient` e `HttpError`. O encerramento de sessão administrativo e do cliente foi o primeiro consumidor migrado, preservando a tolerância existente ao status 401 e a limpeza local mesmo diante de falha de rede. Etapa priorizada 3: **1/4 concluída**. O próximo recorte migrará e separará a infraestrutura financeira.

Estado em 14/09/2026: **segundo recorte concluído**. Endpoints administrativos de consulta, prévia, criação, edição, remoção e confirmação de recebimento foram movidos para `AdminPaymentsApi`; consulta e geração de Pix do cliente foram movidas para `ClientPaymentsApi`. Ambos usam `HttpClient`, validam os contratos financeiros compartilhados na fronteira e expõem gateways pequenos aos módulos. As fachadas existentes apenas delegam para preservar consumidores externos. Etapa priorizada 3: **2/4 concluída**. O próximo recorte separará propostas e clientes.

Estado em 14/09/2026: **terceiro recorte concluído**. Consulta, criação multipart, edição, reenvio, exclusão e remoção de anexos administrativos foram concentrados em `AdminProposalsApi`; consulta e respostas multipart do cliente foram concentradas em `ClientProposalsApi`. As duas APIs usam `HttpClient`, expõem gateways específicos e permanecem acessíveis pelas fachadas durante a migração. Etapa priorizada 3: **3/4 concluída**. O último recorte separará clientes, etapas, relatórios e views residuais.

Estado em 14/09/2026: **quarto recorte concluído**. Clientes, criação e exclusão, etapas e relatórios foram concentrados em `AdminClientsApi`; carregamento das views administrativas e do cliente foi separado em gateways próprios. `AdminSystemApi` e `ClientSystemApi` deixaram de executar `fetch` e agora são fachadas puras de compatibilidade sobre APIs por responsabilidade. Etapa priorizada 3: **4/4 concluída**.

## 25. Execução da Etapa priorizada 4 — controllers HTTP do backend

Estado em 15/09/2026: **primeiro recorte concluído; etapa em andamento**. Os nove endpoints financeiros foram extraídos dos agregadores para `AdminPaymentsController` e `ClientPaymentsController`, com dependências mínimas recebidas pela composition root. Os controllers fazem parsing HTTP, chamam o serviço financeiro e retornam a resposta.

`asyncRoute` encaminha exceções e rejeições com a política de mensagens da rota; `errorHandler` centraliza a tradução de `ApplicationError`, preserva os erros Mongoose administrativos como HTTP 400 e mantém as mensagens inesperadas anteriores. As falhas financeiras inesperadas registram somente a categoria do erro, sem serializar detalhes potencialmente sensíveis. URLs, métodos, autenticação, rate limits, paginação, autoria da sessão, versão e confirmação de histórico permanecem compatíveis.

Validações: build completo, 15 views válidas, 56 testes frontend, 86 testes backend aprovados e uma integração MongoDB ignorada por não estar habilitada. Os 14 E2E passaram, com ampliação do financeiro administrativo para erro de prévia, preservação do formulário e nova tentativa. Os testes HTTP percorrem as rotas reais com serviços simulados; o E2E usa respostas HTTP simuladas. Nenhum dado real foi alterado.

Ambiente local: dependências restauradas pelos lockfiles. No PowerShell foi usado `npm.cmd`; cache npm e navegadores Playwright ficaram em diretórios temporários graváveis. Para repetir os E2E nesta instalação, definir `$env:PLAYWRIGHT_BROWSERS_PATH="$env:TEMP/marcellasol-playwright"`. O Node local 22.20.0 ficou abaixo do requisito declarado por jsdom 30.0.1, embora os testes tenham passado; o build também emitiu avisos preexistentes de referências CSS do portfólio.

Teste manual, em ambiente de teste:

1. Abrir um cliente no admin e acessar Financeiro; conferir listagem e paginação.
2. Gerar uma prévia, criar e editar uma cobrança, marcar recebimento e conferir persistência ao recarregar.
3. Remover uma cobrança de teste, verificando a confirmação adicional quando houver histórico de recebimentos.
4. Entrar como cliente, abrir Financeiro e gerar Pix de uma parcela pendente.

Não há migração nem sincronização de view. Próximo recorte: extrair propostas e relatórios, preservando compensações, uploads e contratos existentes.

### Segundo recorte — propostas, aprovações e relatórios

Estado em 15/09/2026: **segundo recorte concluído; etapa em andamento**.

- Seis endpoints administrativos de propostas foram movidos para `AdminProposalsController`; consulta e geração do relatório ficaram em `AdminReportsController`.
- Os três endpoints de aprovações do cliente ficaram em `ClientApprovalsController`, com respostas delegadas ao `ClientProposalResponseService` já existente.
- Consulta de propostas e cliente, tratamento de cliente ausente e normalização de etapas foram movidos para `ListClientApprovalsService`, com dependências injetadas. O presenter `presentClientProposal` preserva campos públicos, histórico e fallback de anexos legados nas listagens e respostas.
- `asyncRoute` e o middleware central preservam mensagens e status por recurso. A política distingue erros de validação e conversão: propostas administrativas mantêm `ValidationError` como 400 e `CastError` como 500; financeiro mantém ambos como 400.
- Upload multipart, limites, autenticação, compensações e geração de PDF no processo principal foram preservados. Os novos controllers não acessam repositórios nem integrações diretamente.

Validação: oito testes HTTP de caracterização passaram antes e depois da extração; três testes de aplicação/presenter cobrem falhas de consulta, ausência de cliente, histórico, campos públicos e ordem das etapas. Build completo e 15 views válidas; 56 testes frontend e 97 backend aprovados, com uma integração MongoDB ignorada por não estar habilitada. Os 14 E2E passaram; os fluxos de relatório e aprovação agora também cobrem falha e nova tentativa, preservando comentário e arquivo na aprovação. `git diff --check` sem erros.

Os testes HTTP usam rotas e middleware de upload reais com serviços simulados. Os E2E usam respostas HTTP simuladas; nenhuma operação foi executada no banco ou Drive reais. Os avisos preexistentes de CSS no build permanecem registrados no primeiro recorte.

Teste manual, em ambiente de teste:

1. Criar e editar uma proposta com anexos no admin; remover um anexo e verificar que os demais permanecem.
2. Como cliente, solicitar alteração com comentário, confirmação da rodada e anexo; como admin, reenviar a proposta.
3. Aprovar com comentário e anexo; conferir histórico e atualização da etapa.
4. Gerar o relatório de briefing e acessar o resultado; simular falha de rede e verificar a nova tentativa.

Não há migração nem sincronização de view. Próximo recorte: separar clientes e sessões; depois, briefing e views.

## 26. Mudança funcional — confirmação das alterações de proposta

Correção posterior solicitada em 15/09/2026: ao confirmar alterações, a proposta permanece com destino `changes-completed`, mas a etapa vinculada deve ficar `awaiting-client` (Aguardando cliente), substituindo a regra de conclusão da etapa descrita no histórico abaixo. Serviço, teste de aplicação, E2E, contexto e contrato arquitetural atualizados. Não exige migração nem nova sincronização de view. Teste manual: confirmar uma proposta com alterações solicitadas e conferir `Alterações concluídas` na proposta e `Aguardando cliente` na etapa.

Ajuste de organização: propostas com alterações solicitadas (`beated`) ficam em `Propostas abertas`; após confirmar alterações, passam para `Histórico de propostas`. E2E ampliado para verificar os dois containers. Build, 56 testes frontend, 102 backend e 16 E2E aprovados; uma integração MongoDB ignorada. A classificação não exige mudança na view; a renomeação anterior do título continua dependendo da sincronização de `client-proposals-view.json`.

Pedido de 15/09/2026: substituir reenvio por `Confirmar alterações`, mantendo aprovação inicial do cliente. Após confirmação no diálogo `Deseja alterar o status da proposta para 'Alterações concluídas'?`, a proposta muda de `beated` para `changes-completed` e a etapa vinculada fica `completed`. Não há nova aprovação do cliente.

- Novo endpoint administrativo `POST /api/admin/clients/:id/proposals/:proposalId/complete-changes`; rota antiga de reenvio removida.
- Atualização condicional por proprietário e status, rejeitando concorrência e estados incompatíveis. Falha na etapa compensa o status da proposta; histórico e anexos permanecem preservados.
- Diálogo persistido em `client-proposals-view.json`, com selector próprio e componente responsável por foco, cancelamento, envio único, falha/nova tentativa e descarte. Labels de conclusão presentes nas duas áreas.
- Compatibilidade de leitura mantida para `resent`, `beated` e demais registros antigos. Nenhuma migração de dados necessária. Propostas legadas sem etapa vinculada são concluídas sem criar vínculo artificial.
- Sincronização manual necessária: `dev/database/client-proposals-view.json`, junto da publicação do frontend e backend. A view antiga não contém o novo diálogo. Banco e Drive reais não foram alterados.

Teste manual: abrir proposta com alterações solicitadas; cancelar a confirmação e conferir que nada mudou; confirmar e verificar `Alterações concluídas`, etapa `Aguardando cliente` e histórico preservado; entrar como cliente e conferir que não existe nova ação de aprovação. Propostas inicialmente enviadas ainda permitem aprovar ou solicitar alteração.

A refatoração permanece na Etapa 4, agora com três recortes concluídos. Próximo recorte estrutural: briefing e views do backend.

Validações desse incremento funcional: build completo, 15 views válidas, 56 testes frontend, 102 testes backend aprovados e uma integração MongoDB ignorada por não estar habilitada. Os 16 E2E passaram, incluindo cancelamento, falha/nova tentativa, etapa `Aguardando cliente` e ausência de nova aprovação do cliente. `git diff --check` sem erros. Os testes usam serviços ou respostas HTTP simulados; não foi feita sincronização no banco real.

### Terceiro recorte — clientes e sessões

Estado em 16/09/2026: **concluído**. Consulta, criação, exclusão e atualização das etapas de clientes foram extraídas para `AdminClientsController`. Login, consulta e logout foram separados em `AdminSessionsController` e `ClientSessionsController`. O agregador `AdminController` foi removido; `ClientController` permaneceu responsável apenas pelo envio do briefing. A composição injeta dependências mínimas e as rotas usam o middleware central de erros com mensagens específicas por operação.

Cobertura HTTP adicionada para listagem de clientes, mudança de etapa, login administrativo, consulta da sessão do cliente e logout. Build e testes unitários/integrados passaram. Não há migração nem sincronização de view. Teste manual: entrar como administrador, listar clientes e mudar uma etapa; encerrar a sessão; entrar como cliente e restaurar/encerrar a sessão. Próximo recorte: briefing e views do backend.

### Quarto recorte — briefing e views

Estado em 16/09/2026: **concluído; Etapa 4 concluída**. O envio do briefing foi movido para `ClientBriefingController`, mantendo parsing multipart, validação do manifesto, identidade autenticada e delegação ao serviço de aplicação. As respostas de views foram separadas em `AdminViewsController` e `ClientViewsController`; os antigos agregadores `ClientController` e `ViewController` foram removidos. Rotas e composição passaram a depender diretamente dos controllers específicos e encaminham falhas pelo middleware central.

Cobertura HTTP ampliada para submissão de briefing sem anexos, view do briefing administrativo e view autenticada do cliente. Não há migração nem sincronização de view, pois os contratos persistidos não mudaram. Teste manual: enviar um briefing como cliente, recarregar a área do cliente e abrir o fluxo administrativo de briefing. Próxima etapa priorizada: briefing administrativo e criação de cliente.

## 27. Execução da Etapa priorizada 5 — briefing administrativo e criação de cliente

### Primeiro recorte — infraestrutura das views do briefing

Estado em 16/09/2026: **concluído; etapa em andamento**. O `fetch` direto foi removido do controller administrativo de briefing. `AdminViewsApi` agora carrega `/view/admin/briefing` pelo `HttpClient`, e a sessão e o gateway são injetados desde `ClientCreationFlow`. O formato das views, os templates persistidos e o payload de criação do cliente não mudaram.

Teste automatizado cobre URL, método, token e retorno das views. Teste manual: iniciar a criação de um cliente e confirmar que a primeira página do briefing carrega. Não há migração nem sincronização de view. Próximo recorte: separar navegação e estado dos editores de cada passo.

### Segundo recorte — navegação do briefing administrativo

Estado em 16/09/2026: **concluído; etapa em andamento**. Breadcrumbs, avanços, retornos, adição de cômodos e confirmação final foram extraídos para `AdminBriefingNavigator`. `ClientCreationFlow` injeta o navegador, enquanto o controller de briefing conserva apenas a preparação dos campos e o estado dos editores ainda não separados. Callbacks sem tipo e logs temporários foram removidos.

Testes isolados cobrem bloqueio do avanço com campos inválidos, rotas de residência, investimento e cômodos, adição de ambiente e confirmação final. Views e payload não mudaram. Teste manual: percorrer todas as páginas da criação, usar breadcrumbs e botões de voltar, adicionar um cômodo e chegar à confirmação. Próximo recorte: editores de residência, investimento e cômodos.

Ajuste funcional solicitado em 16/09/2026: o botão secundário de `Dados do briefing` foi renomeado de `Cancelar` para `Voltar` e agora retorna para `Dados do cliente`. O botão equivalente em `Cômodos do briefing`, que já retornava para investimento, também passou a exibir `Voltar`. As alterações estão em `admin-briefing-home-view.json` e `admin-briefing-rooms-view.json` e exigem sincronização manual dessas duas views. Testes unitários e E2E cobrem texto e navegação.

Complemento do ajuste: o fluxo mantém nome, login, senha e o briefing em memória ao retornar das páginas seguintes para `Dados do cliente`. Ao montar novamente a listagem de clientes, esse rascunho é removido; um acesso posterior a `Novo cliente` começa vazio. O E2E verifica restauração e descarte no mesmo fluxo.

Correção adicional: o botão `Voltar` de `Revisar e finalizar` foi conectado ao `AdminBriefingNavigator` e retorna para `Cômodos do briefing`, com cobertura unitária e E2E.

### Terceiro recorte — editor de dados do briefing

Estado em 16/09/2026: **concluído; etapa em andamento**. Restauração dos campos, eventos de edição, normalização das quantidades e validação da primeira página foram extraídos para `AdminBriefingDetailsEditor`. O controller passou a apenas localizar os elementos e conectar o editor ao `AdminBriefingNavigator`.

Testes isolados cobrem restauração do estado, atualização do objeto de briefing, remoção de espaços do nome, quantidades válidas e rejeição de nome vazio, zero adulto e quantidade fracionária. Views e payload não mudaram. Próximo recorte: editor de investimento.

### Quarto recorte — editor de investimento

Estado em 16/09/2026: **concluído; etapa em andamento**. Restauração e sincronização da opção de flexibilidade foram extraídas para `AdminBriefingInvestmentEditor`. O controller apenas obtém os elementos, monta o editor e conecta a navegação.

Testes isolados cobrem restauração das opções marcada e desmarcada e atualização do rascunho pelo evento de mudança. Views e payload não mudaram. Próximo recorte: editor de cômodos.

### Quinto recorte — editor de cômodos

Estado em 16/09/2026: **concluído; etapa em andamento**. Criação, restauração, personalização por tipo, exclusão, arraste, reordenação e sincronização do payload foram movidos para `AdminBriefingRoomsEditor`. O controller deixou de manter IDs, índices e estado visual dos cômodos. Um log temporário da montagem do template também foi removido.

Testes isolados cobrem adição, edição de nome e tipo, opções personalizadas, restauração ao voltar, exclusão e sincronização da ordem visual. Views e payload não mudaram. Próximo recorte: submissão da criação do cliente.

### Sexto recorte — submissão da criação do cliente

Estado em 16/09/2026: **concluído; etapa em andamento**. A chamada de criação, o bloqueio de envio duplicado, o estado desabilitado do botão, a recuperação após falha e a navegação depois do sucesso foram extraídos para `ClientCreationSubmission`. `ClientCreationFlow` apenas entrega o payload montado na confirmação.

Testes isolados cobrem concorrência, chamada única, sessão, payload, sucesso e nova tentativa após falha. O E2E simula falha HTTP, reativação da confirmação e criação na segunda tentativa. Views e payload não mudaram. Próximo recorte: simplificação final do `ClientCreationFlow`.

### Sétimo recorte — simplificação final do fluxo

Estado em 16/09/2026: **concluído; Etapa 5 concluída**. O wrapper `newClient`, que misturava credenciais e delegação ao controller, foi removido. O novo `ClientCreationDraft` mantém as credenciais e monta o payload sem depender do DOM. `ClientCreationFlow` passou a coordenar diretamente o rascunho, `AdminBriefingController`, navegador, resumo e submissão.

Teste isolado cobre atualização das credenciais e montagem do payload sem perda do briefing. A suíte E2E preserva o fluxo completo, retorno entre páginas, restauração do rascunho, cômodos e falha/nova tentativa na criação. Não há migração nem nova sincronização de view. Próxima etapa priorizada: integrações Google Drive.

### Organização dos módulos administrativos por escopo

Estado em 16/09/2026: **concluído**. A pasta `frontend/src/admin/modules` foi organizada em quatro escopos: `system/` para shell, home e composição; `clients/` para listagem, gestão, propostas e financeiro; `client-creation/` para fluxo, rascunho e submissão; e `client-creation/briefing/` para os editores de dados, investimento e cômodos. Imports de produção e testes foram atualizados sem mudança de comportamento. Não há migração nem sincronização de view.

## 28. Execução da Etapa priorizada 6 — integrações Google Drive

### Primeiro recorte — cliente Google compartilhado

Estado em 17/09/2026: **concluído; etapa em andamento**. Autenticação OAuth, validação das credenciais, agente HTTPS com IPv4 e criação do cliente oficial foram movidos para `GoogleDriveClientProvider`. Uma única instância do cliente é reutilizada durante o processo, evitando recriar autenticação em cada operação. `createDriveClient` permanece como fachada temporária para preservar os consumidores atuais enquanto os storages especializados são extraídos.

Testes isolados comprovam criação única, reutilização da instância, refresh token normalizado e falha antes da fábrica quando faltam credenciais. A política de rede existente permanece coberta. Não há alteração de dados, views, estrutura do Drive ou configuração da VPS. Próximo recorte: extrair permissões de pasta para um storage próprio.

### Segundo recorte — permissões de pastas

Estado em 17/09/2026: **concluído; etapa em andamento**. Consulta paginada e criação de permissões de leitura foram extraídas para `GoogleDriveFolderPermissionStorage`. O serviço de aplicação depende agora da porta mínima `FolderReadAccessStorage`, e a composição e o script de compartilhamento retroativo usam o adaptador específico. A fachada ampla de anexos deixou de conhecer permissões.

O cliente Google permanece preguiçoso: as credenciais e a conexão só são requisitadas quando uma operação de permissão é executada. Testes isolados cobrem permissão existente em uma página posterior, normalização de e-mail, registros excluídos e criação de acesso `reader` com notificação. O fluxo E2E existente de envio do briefing continua cobrindo a jornada externa; esta refatoração não altera interface ou contrato HTTP. Não há migração, sincronização de view ou alteração na estrutura do Drive. Próximo recorte: separar o storage de anexos de propostas.

### Terceiro recorte — anexos de propostas

Estado em 17/09/2026: **concluído; etapa em andamento**. Upload, organização das pastas por autor e resposta, renomeação, migração e envio de anexos à lixeira foram consolidados em `GoogleDriveProposalStorage`. Os serviços de propostas dependem agora da porta mínima `ProposalStorage`, e a fachada ampla de anexos deixou de conhecer o domínio de propostas.

A fábrica do cliente Drive é injetável e continua preguiçosa. Testes do adaptador cobrem a hierarquia `propostas/proposta/cliente/resposta-N`, saneamento do título, URL alternativa e rejeição de URLs externas antes de acessar o Google. O E2E foi ampliado para solicitação de alteração com comentário, confirmação da rodada e anexo do cliente. Não há migração, sincronização de view ou mudança da estrutura já adotada no Drive. Próximo recorte: separar briefing e relatórios.

### Quarto recorte — briefing e relatórios

Estado em 17/09/2026: **concluído; etapa em andamento**. Uploads do briefing foram extraídos para `GoogleDriveBriefingStorage`; consulta, criação e substituição do PDF e download seguro de imagens ficaram em `GoogleDriveBriefingReportStorage`. Os respectivos serviços de aplicação dependem agora das portas mínimas `BriefingAttachmentStorage` e `BriefingReportStorage`. A fachada legada permaneceu somente com criação e descarte da pasta raiz do cliente.

Ambos os adaptadores recebem uma fábrica preguiçosa do cliente Google. Testes isolados cobrem ausência de inicialização sem arquivos, hierarquia e metadados do briefing, localização do PDF e recusa de conteúdo que não seja imagem. Os E2E existentes já cobrem envio de briefing e geração/nova tentativa do relatório; como este recorte não muda comportamento de interface, nenhum cenário foi duplicado e a suíte E2E não foi executada, conforme a regra vigente. Não há migração, sincronização de view ou mudança na estrutura do Drive. Próximo recorte: extrair o ciclo de vida da pasta do cliente e remover as fachadas legadas.

### Quinto recorte — pasta do cliente e remoção das fachadas

Estado em 17/09/2026: **concluído; Etapa 6 concluída**. Criação, saneamento e envio/restauração da pasta raiz do cliente na lixeira foram extraídos para `GoogleDriveClientFolderStorage`. A busca ou criação idempotente de diretórios ficou no helper técnico `drive-folder`, reutilizado por cliente, briefing, propostas e relatórios. `GoogleDriveAttachmentStorage` e `googleDrive.ts` foram removidos, assim como seus imports e nomes genéricos.

Testes isolados cobrem a hierarquia `raiz/clientes/cliente`, saneamento do login e os dois sentidos da operação de lixeira. Os E2E existentes cobrem criação e exclusão administrativa de clientes; como não houve mudança na interface ou contrato, nenhum cenário foi duplicado e a suíte não foi executada. Não há migração, sincronização de view ou alteração na estrutura persistida do Drive. Próxima etapa priorizada: geração de relatórios.

## 29. Execução da Etapa priorizada 7 — geração de relatórios

### Primeiro recorte — snapshot estrutural do HTML

Estado em 17/09/2026: **concluído; etapa em andamento**. Foi criado um snapshot semântico do relatório representativo, cobrindo idioma, título, capa e metadados, ordem dos capítulos e seções, blocos de adultos e crianças, tabela de acabamentos, índice e conteúdo de cômodos. O teste analisa o HTML como árvore, evitando um snapshot textual opaco e protegendo a estrutura enquanto mapper, template, estilos e renderer forem extraídos.

Não houve mudança de produção, interface, dados ou aparência. O E2E não foi ampliado nem executado porque este recorte apenas caracteriza o contrato interno já coberto pelos fluxos existentes. Não há migração nem sincronização de view. Próximo recorte: extrair o mapper do relatório e cobrir entradas incompletas e legadas.

### Segundo recorte — mapper do relatório

Estado em 17/09/2026: **concluído; etapa em andamento**. A transformação do documento persistido em um view model estável foi extraída para `briefing-report.mapper.ts`. O mapper define o contrato de respostas, seções, cômodos, projeto e data, fornece valores seguros para documentos incompletos e converte `residentAmount` legado em adultos com zero crianças quando os novos campos ainda não existem. Dados atuais e a data de envio das respostas continuam tendo precedência.

O gerador HTML consome o view model sem alterar sua estrutura; o snapshot semântico permaneceu aprovado. Testes isolados cobrem documento vazio, formato legado, formato atual, precedência e data Mongoose representada como `Date` ou `$date`. Não houve mudança de interface, portanto nenhum E2E foi criado ou executado. Não há migração nem sincronização de view. Próximo recorte: extrair template e estilos do relatório.

### Terceiro recorte — template e estilos

Estado em 17/09/2026: **concluído; etapa em andamento**. A montagem do documento foi movida para `briefing-report.template.ts` e o CSS integral para `briefing-report.styles.ts`. O módulo `briefing-report.ts` preserva temporariamente o contrato público e concentra apenas a renderização Puppeteer, que será substituída pelo adaptador final. O template recebe o view model pelo mapper e não conhece Chromium.

O snapshot semântico e os testes de conteúdo permaneceram aprovados; um teste adicional confirma que o template incorpora integralmente o módulo de estilos. Não houve mudança visual ou de interface, portanto nenhum E2E foi criado ou executado. Não há migração nem sincronização de view. Próximo recorte: extrair a resolução e preparação de imagens privadas.

### Quarto recorte — resolução de imagens privadas

Estado em 17/09/2026: **concluído; etapa em andamento**. Busca recursiva, filtro, deduplicação, limite de vinte imagens, download, conversão para JPEG e associação da URL local foram extraídos para `BriefingReportImageResolver`. O serviço de aplicação passou a receber a porta `ReportImageResolver` pela composição e não conhece mais Sharp, dimensões, qualidade ou detalhes de arquivos de imagem.

Testes isolados cobrem deduplicação, exclusão de anexos não visuais, limite máximo, nomes dos arquivos temporários e continuidade após falha individual. O snapshot estrutural permaneceu aprovado. Não houve mudança de interface, portanto nenhum E2E foi criado ou executado. Não há migração nem sincronização de view. Próximo recorte: encapsular Puppeteer em um renderer e finalizar a simplificação do serviço.

### Quinto recorte — renderer PDF e conclusão da etapa

Estado em 17/09/2026: **concluído; etapa finalizada**. A inicialização e o encerramento do Chromium, o carregamento do HTML, a espera limitada pelas imagens e as opções de impressão A4 foram isolados em `PuppeteerPdfRenderer`, atrás da porta `PdfRenderer`. O renderer recebe HTML pronto e não conhece briefing, mapper, Drive ou regras do caso de uso. `ClientBriefingReportService` ficou responsável somente por coordenar cliente, briefing, diretório temporário, resolução de imagens, template, renderer e upload.

A fila global em memória permanece no processo principal com concorrência 1, e solicitações simultâneas para o mesmo cliente compartilham a geração em andamento. Testes isolados cobrem arquivo HTML temporário, configuração do PDF, encerramento do navegador em falha, deduplicação por cliente e serialização entre clientes. O HTML e a aparência não foram alterados. Nenhum E2E foi criado ou executado; não há migração nem sincronização de view. Etapa priorizada 7: **5/5 concluída**. Próxima etapa priorizada: CSS das telas complexas.

## 30. Execução da Etapa priorizada 8 — CSS das telas complexas

A etapa será executada em cinco recortes: propostas administrativas; briefing do cliente; financeiros administrativo e do cliente; etapas/aprovações e navegação; revisão final dos estilos complexos e compartilhamentos comprovados.

### Primeiro recorte — propostas administrativas

Estado em 18/09/2026: **concluído; etapa 1/5**. O arquivo `client-proposals.css`, que reunia estrutura da página, editor de etapas, cartões, diálogos e responsividade, tornou-se um ponto de entrada estável. As regras foram separadas em `page.css`, `project-stages.css`, `proposal-list.css`, `proposal-dialogs.css` e `responsive.css`, preservando a ordem integral da cascata e as classes usadas pela view persistida.

Um teste estrutural protege a ordem dos imports e a responsabilidade dos arquivos. A cobertura E2E administrativa passou a verificar estilos representativos da página, progresso, cartão e diálogo; conforme o padrão vigente, o E2E foi adicionado, mas não executado. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: organizar o CSS do briefing do cliente.

### Segundo recorte — briefing do cliente

Estado em 18/09/2026: **concluído; etapa 2/5**. O antigo arquivo monolítico `briefing.css`, com mais de 1.700 linhas, tornou-se um ponto de entrada que preserva o link existente em `cliente.html`. As regras foram separadas, na ordem original, entre `base.css`, `controls.css`, `pages.css`, `environments.css`, `review.css` e `responsive.css`. A separação acompanha responsabilidades visuais concretas sem alterar templates, classes, especificidade ou aparência.

Teste estrutural protege os imports e seletores representativos de cada componente. Foi acrescentado um cenário E2E para conferir shell, contêiner, campos e navegação com os estilos carregados, mas ele não foi executado. A equivalência integral do conteúdo anterior foi verificada e o build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: organizar os estilos financeiros do administrador e do cliente.

### Terceiro recorte — financeiros administrativo e do cliente

Estado em 18/09/2026: **concluído; etapa 3/5**. Os estilos financeiros foram organizados em pontos de entrada independentes, sem criar compartilhamento artificial entre interfaces com capacidades distintas. No administrador, página, pagamentos, formulário, confirmação de exclusão, ações e responsividade possuem arquivos próprios. No cliente, página, destaque, painel, pagamentos, diálogo Pix, ações e responsividade foram separados na ordem original.

Testes estruturais protegem a ordem dos imports e os principais seletores das duas áreas. A cobertura E2E passou a verificar o carregamento visual do painel e formulário administrativo, além da página, destaque e painel do cliente; os E2E foram adicionados, mas não executados. O conteúdo das cascatas permaneceu integralmente equivalente e o build foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: etapas/aprovações e navegação.

### Quarto recorte — etapas, aprovações e navegação

Estado em 18/09/2026: **concluído; etapa 4/5**. O CSS de etapas e aprovações do cliente foi separado entre página, progresso, cartões, diálogos, respostas/ações e responsividade, preservando a ordem integral das regras. A navegação autenticada, antes duplicada quase integralmente, foi consolidada em `shared/styles/authenticated-navigation.css`; administrador e cliente mantêm pontos de entrada próprios, e somente o cliente declara os ajustes específicos para textos mais longos e layout móvel.

Testes estruturais protegem os imports, responsabilidades e uso do componente compartilhado. A cobertura E2E do cliente passou a verificar navegação, progresso e cartão de proposta com os estilos carregados, mas não foi executada. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: revisão final dos estilos complexos, duplicações comprovadas e seletores globais residuais.

### Quinto recorte — fronteiras globais e revisão final

Estado em 18/09/2026: **concluído; etapa finalizada em 5/5**. Os três resets idênticos de administrador, cliente e portfólio foram consolidados em `shared/styles/reset.css`, mantendo pontos de entrada compatíveis em cada aplicação. Seletores genéricos do briefing foram limitados a `.briefing-app` e ao estado `client-briefing-active`; o estado desabilitado do financeiro administrativo foi restringido ao seu contêiner e diálogos. Assim, folhas carregadas globalmente deixam de alterar controles pertencentes a outras telas.

Testes estruturais protegem o reset compartilhado e impedem a reintrodução dos seletores globais auditados. A cobertura E2E do briefing verifica que o fundo específico só é aplicado durante o fluxo, mas não foi executada. A suíte comum e o build de produção foram aprovados. Não há alteração de view, migração ou sincronização do banco. Etapa priorizada 8: **5/5 concluída**. Próxima etapa priorizada: aplicação do cliente fora do briefing.

## 31. Execução da Etapa priorizada 9 — aplicação do cliente fora do briefing

A etapa será executada em cinco recortes: shell autenticado e navegação; home; etapas e aprovações; revisão dos módulos de resposta a propostas e financeiro; simplificação final da composição e do ciclo de vida da aplicação do cliente.

### Primeiro recorte — shell autenticado e navegação

Estado em 24/09/2026: **concluído; etapa 1/5**. A montagem da estrutura base, a navegação desktop e móvel e o encaminhamento do logout foram extraídos de `ClientSystemModules` para `ClientShellModule`. O módulo expõe somente os elementos de navegação necessários aos módulos de página e mantém os listeners globais vinculados ao ciclo de vida da view por `AbortController`.

`ClientSystemModules` deixou de conhecer os detalhes de abertura, fechamento, teclado, redimensionamento e sincronização do menu móvel. O teste unitário passou a exercitar diretamente o novo componente, e foi adicionado um cenário E2E de navegação pelo shell móvel; conforme o padrão vigente, o E2E não foi executado. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: extrair a home do cliente.

### Segundo recorte — home do cliente

Estado em 24/09/2026: **concluído; etapa 2/5**. A montagem da home, a seleção visual do item de navegação e os acessos rápidos para etapas/aprovações e financeiro foram extraídos para `ClientHomeModule`. `ClientSystemModules` apenas instancia o módulo e encaminha a rota `home`, sem conhecer os elementos ou eventos específicos da tela.

O selector da home passou a validar os dois elementos obrigatórios e a identificar explicitamente uma view persistida incompatível. Testes unitários cobrem as duas rotas e a ausência de elementos; um E2E cobre a navegação pelos dois acessos rápidos, mas não foi executado conforme o padrão vigente. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: extrair etapas e aprovações.

### Terceiro recorte — etapas e aprovações

Estado em 24/09/2026: **concluído; etapa 3/5**. A montagem da tela, a navegação de retorno, o carregamento de propostas, a apresentação das etapas e os estados vazio e de erro foram extraídos para `ClientStagesApprovalsModule`. O módulo compõe `ClientProposalResponseModule`, mas não absorve as regras dos diálogos ou decisões sobre propostas.

O ciclo de vida agora invalida carregamentos pendentes quando a tela é descartada, impedindo respostas antigas de alterarem uma interface que não está mais ativa. Testes unitários cobrem carregamento, navegação, falha e descarte durante uma requisição; foi adicionado um E2E para o estado de erro e retorno à home, sem execução conforme o padrão vigente. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: revisar o ciclo de vida das respostas a propostas e o financeiro residual.

### Quarto recorte — ciclo de vida das respostas e do financeiro

Estado em 24/09/2026: **concluído; etapa 4/5**. `ClientProposalResponseModule` passou a possuir descarte explícito para listeners e decisões assíncronas. Aprovações ou solicitações concluídas depois da saída da tela não substituem cartões, não alteram etapas e não reativam controles de diálogos desmontados. `ClientStagesApprovalsModule` mantém e descarta o componente de resposta que compõe.

No financeiro, todos os eventos da tela foram associados a um `AbortController`, incluindo navegação, paginação, Pix e cópia. Resoluções e falhas tardias de geração Pix, paginação ou clipboard são ignoradas depois do descarte, junto dos timers já controlados pelo módulo. Testes unitários cobrem descarte durante aprovação e carregamento financeiro, além da remoção dos listeners; foi adicionado um E2E para retorno à home durante carregamento financeiro, sem execução. O build de produção foi aprovado. Não há alteração de view, migração ou sincronização do banco. Próximo recorte: simplificação final da composição e revisão estrutural da aplicação do cliente.

### Quinto recorte — composição e revisão estrutural final

Estado em 24/09/2026: **concluído; etapa finalizada em 5/5**. A entrada no briefing foi encapsulada em `ClientBriefingRouteModule`, que controla montagem única, inicialização e encaminhamento da etapa restaurada. `ClientSystemModules` passou a compor exclusivamente módulos de rota — shell, home, briefing, etapas/aprovações e financeiro — e não retém mais view, modelos, API, token ou callback de navegação depois de construir seus componentes.

Testes unitários cobrem montagem única do briefing, etapas válidas e inválidas e restauração da tela de etapas/aprovações depois do shell. Um E2E cobre restauração direta dessa tela com sessão salva, mas não foi executado conforme o padrão vigente. A suíte comum e o build de produção foram aprovados. Não há alteração de view, migração ou sincronização do banco. Etapa priorizada 9: **5/5 concluída**. Próxima etapa priorizada: persistência e listagens.

## 32. Execução da Etapa priorizada 10 — persistência e listagens

A etapa será executada em cinco recortes: portas mínimas de consulta; paginação de clientes; paginação de propostas; compatibilidade e concorrência financeira; revisão final das fronteiras de persistência e listagens.

Alterações desta etapa devem ser incrementais. Pagamentos reais não podem ser regravados ou migrados como efeito de uma refatoração, e qualquer índice novo deverá ser justificado pela consulta que o utiliza e aplicado por operação explícita.

### Primeiro recorte — portas mínimas de consulta

Estado em 24/09/2026: **concluído; etapa 1/5**. Foram criadas `ClientListingRepository` e `BriefingListingRepository` na camada de portas da aplicação. `ListClientsService` passou a depender somente das quatro consultas necessárias para listar clientes e carregar detalhes, sem importar as classes concretas de persistência nem receber capacidades de escrita.

Os registros projetados pela consulta administrativa possuem contratos explícitos, preservando `ObjectId`, etapas e definição legada do briefing neste recorte incremental. Teste de contrato garante que a listagem utiliza apenas as consultas mínimas; foi adicionado um E2E para a apresentação de nome, tipo, etapa e status devolvidos pela consulta, mas não foi executado conforme o padrão vigente. O build do backend foi aprovado. Não houve escrita, migração, índice, alteração de view ou acesso a pagamentos reais. Próximo recorte: paginação da listagem de clientes.

## 33. Etapa priorizada 12 — persistência visual

Estado em 25/09/2026: **Etapa 12 concluída (7/7)**. Todas as superfícies autenticadas elegíveis possuem persistência visual em memória.

### Objetivo

Eliminar o reaparecimento abrupto de coleções dinâmicas durante a navegação dentro da mesma sessão autenticada. Depois do primeiro carregamento de uma tela, a próxima visita deve apresentar imediatamente uma prévia baseada no último resultado conhecido, enquanto uma nova requisição valida os dados no servidor. Ao concluir, a interface aplica somente inclusões, alterações, remoções e reordenações necessárias.

O cache é uma otimização visual e nunca uma fonte de verdade. Toda entrada na página continua disparando a consulta oficial, e nenhuma operação de criação, edição, exclusão, pagamento ou aprovação pode ser decidida apenas pelo conteúdo armazenado localmente.

### Escopo definido

Antes do primeiro recorte deverá ser criado um inventário das telas que atendem simultaneamente a estes critérios:

1. realizam uma consulta autenticada de leitura;
2. recebem uma coleção ou objeto de apresentação do backend;
3. criam ou atualizam elementos visuais a partir dessa resposta;
4. podem ser revisitadas na mesma sessão.

O escopo aprovado abrange todas as telas autenticadas do cliente e do administrador que atendam aos critérios acima. O inventário continua obrigatório para identificar chaves, DTOs e invalidações, mas não será usado para excluir uma tela elegível. O portfólio público permanece fora do escopo enquanto a arquitetura da Etapa 11 não for definida.

### Arquitetura proposta

- `SessionVisualCache` será o armazenamento técnico central, mantido em uma propriedade privada de instância, com chaves separadas por papel, sujeito autenticado, tela, parâmetros e versão do contrato.
- `VisualPersistenceController` coordenará leitura da prévia, revalidação e publicação do novo snapshot, sem conhecer DOM específico.
- Cada módulo de tela continuará responsável por transformar seu DTO em elementos e deverá fornecer identidade estável para cada item.
- A reconciliação será feita por chave estável, como `client.id`, `proposal._id` ou `payment.id`, nunca pela posição visual.
- Cada adaptador de coleção deverá distinguir `insert`, `update`, `remove`, `move` e `unchanged`.
- Atualizações deverão preservar nós DOM inalterados sempre que possível, evitando reconstruir toda a lista, perder foco, reiniciar animações ou causar deslocamentos visuais desnecessários.
- Requisições concorrentes para a mesma chave serão deduplicadas ou versionadas; somente a resposta mais recente da tela ativa poderá publicar um snapshot.

### Armazenamento e ciclo de vida

O armazenamento será exclusivamente em memória e durará enquanto a instância da aplicação autenticada permanecer aberta. Os snapshots ficarão em propriedades privadas de classes TypeScript, como um `Map` interno; “atributos de classes” não significa atributos HTML, `dataset` ou estado acoplado ao DOM.

É proibido usar `localStorage`, `sessionStorage`, IndexedDB, cookies ou qualquer persistência em disco para esta etapa. F5, fechamento da aba ou recriação da aplicação eliminam todas as prévias; a primeira visita após isso volta ao carregamento normal.

Todo snapshot deverá conter `schemaVersion`, identidade da sessão e chave da consulta. Não haverá TTL: a validade máxima é a vida da instância em memória. O cache também será descartado explicitamente no logout, falha de autenticação, troca de usuário ou papel, mudança de versão incompatível e mutação que invalide a coleção.

### Fluxo da tela

1. O módulo solicita ao controlador a chave da tela.
2. Se existir snapshot válido, a tela renderiza imediatamente a prévia e atualiza em segundo plano sem substituir o conteúdo por skeleton e sem apresentar indicador visual de atualização.
3. A consulta oficial é executada em todas as entradas.
4. O resultado é normalizado para um DTO de apresentação estável.
5. O reconciliador compara identidades e campos relevantes, desconsiderando diferenças sem impacto visual.
6. A interface aplica somente o delta e publica o snapshot atualizado.
7. Em falha com cache disponível, a prévia permanece visível e o tratamento de erro normal da tela é preservado, sem criar um estado visual específico de cache desatualizado; sem cache, permanece o tratamento de erro atual.

### Mutações e invalidação

- criação adiciona ou invalida o item/coleção correspondente somente após confirmação do servidor;
- edição atualiza o snapshot com a resposta oficial;
- exclusão confirmada remove o item e quaisquer detalhes dependentes;
- aprovação de proposta invalida proposta, etapas e listas relacionadas;
- ações financeiras invalidam resumo, destaque, pagamento e página que os contém;
- invalidação deve ser declarada pelo caso de uso de interface responsável, sem acoplamento implícito entre telas;
- falhas de mutação preservam o último snapshot confirmado e os dados preenchidos para nova tentativa.

### Recortes planejados

1. inventário de telas, chaves estáveis, dados permitidos e eventos de invalidação;
2. contratos do cache em memória, controlador de revalidação e proteção contra respostas antigas;
3. reconciliador de coleções com testes de inserção, atualização, remoção e reordenação;
4. adoção piloto na listagem administrativa de clientes;
5. propostas e etapas/aprovações;
6. financeiros, com política restritiva para dados sensíveis e pagamentos reais;
7. expansão para demais telas aprovadas, auditoria de acessibilidade, desempenho e conclusão.

### Primeiro recorte — inventário de superfícies e invalidações

O inventário considera como snapshot apenas DTOs de apresentação já normalizados pelas APIs do frontend. Tokens, objetos `File`, conteúdo de campos em edição, elementos DOM e respostas HTTP brutas não fazem parte do cache.

| Superfície | Chave de consulta proposta | Snapshot permitido | Identidade estável | Eventos de atualização/invalidação |
| --- | --- | --- | --- | --- |
| Lista administrativa de clientes | `admin:{adminId}:clients:v1` | páginas carregadas de `AdminClientListItem`, paginação e total exibido | `client.id` | criação inclui/invalida a coleção; exclusão remove cliente e detalhes dependentes; mudança de etapa atualiza o item; logout/troca de administrador limpa tudo |
| Gestão administrativa do cliente | `admin:{adminId}:client:{clientId}:v1` | `AdminClientDetails` e `BriefingReportStatus` | `client.id` | mudança/reordenação de etapa atualiza detalhes e lista; geração de relatório atualiza o status; exclusão remove detalhes; alterações do briefing invalidam relatório e detalhes |
| Propostas administrativas | `admin:{adminId}:client:{clientId}:proposals:v1` | páginas de `ClientProposal`, paginação e etapas apresentadas | `proposal._id`; etapas por `stage.key` | criar/editar/confirmar alterações usa resposta oficial; remover proposta/anexo atualiza ou invalida; mudança de etapa atualiza propostas, detalhes e lista de clientes |
| Financeiro administrativo | `admin:{adminId}:client:{clientId}:payments:v1` | pagamentos administrativos, paginação, resumo e destaque | `payment.id`; parcelas por tipo e número | criar/editar/receber/reverter usa resposta oficial e invalida resumo/destaque; remoção exclui item; conflito de versão invalida a coleção antes da recarga |
| Etapas e aprovações do cliente | `client:{clientId}:stages-approvals:v1` | páginas de propostas públicas, paginação, etapas e etapa atual | `proposal._id`; etapas por `stage.key` | aprovação ou solicitação de alteração substitui a proposta e as etapas pela resposta oficial; alterações administrativas aparecem na revalidação; logout/troca de cliente limpa tudo |
| Financeiro do cliente | `client:{clientId}:payments:v1` | pagamentos públicos, paginação, resumo e destaque sem segredos Pix | `payment.id`; parcelas por tipo e número | geração de Pix atualiza somente metadados públicos do pagamento/destaque; confirmação administrativa aparece na revalidação; logout/troca de cliente limpa tudo |

#### Política de dados do inventário

- A identidade de sessão usada nas chaves deverá ser um identificador estável do sujeito autenticado, nunca o token Bearer.
- Propostas podem armazenar URLs e metadados textuais de anexos já públicos ao papel autenticado; arquivos selecionados para envio e binários permanecem fora.
- O financeiro administrativo pode armazenar somente o contrato já apresentado na tela. Eventos internos de auditoria, recibos internos e dados não presentes no DTO ficam proibidos.
- O financeiro do cliente não armazenará `brCode`, QR Code em data URL ou conteúdo de clipboard. O snapshot pode manter apenas os metadados públicos de vigência Pix já presentes no pagamento e no destaque.
- Cursores podem compor o snapshot técnico da coleção, mas são opacos e não constituem identidade de item.
- Estados transitórios como `loading`, erro, diálogo aberto, foco, texto digitado, seleção de arquivo e contagem regressiva não são persistidos.

#### Superfícies autenticadas não elegíveis neste momento

- Shells e homes usam views já carregadas e conteúdo estático, sem consulta de coleção por visita.
- Criação de cliente e briefing administrativo representam estado de formulário; continuam sob `ClientCreationDraft` e não entram no cache visual.
- O briefing do cliente é montado a partir da definição já obtida na sessão e possui serviços próprios para rascunho textual e arquivos. Misturar esses dados ao cache visual criaria duas fontes locais de estado.
- Views persistidas são carregadas na composição da aplicação e mantidas nos modelos; seu cache de template não pertence à persistência visual de DTOs.
- O portfólio público permanece excluído até a definição da Etapa 11.

Este inventário orienta os contratos de `SessionVisualCache` e `VisualPersistenceController`; a adoção por telas permanece reservada aos recortes posteriores.

### Segundo recorte — cache em memória e controlador de revalidação

`SessionVisualCache` concentra snapshots clonados em um `Map` privado por instância autenticada. A chave é determinística mesmo quando os parâmetros chegam em ordens diferentes e inclui tela, parâmetros e versão positiva do contrato. A identidade e o papel pertencem ao escopo da instância; token de sessão não é aceito como parte da chave pelo contrato.

`VisualPersistenceController` executa o fluxo de prévia e consulta oficial sem conhecer DOM ou APIs específicas. Cada nova revalidação incrementa a geração da chave; respostas de gerações anteriores se tornam obsoletas e não publicam nem sobrescrevem o snapshot mais recente. Falhas preservam a prévia confirmada e informam ao consumidor se ela existia.

O controlador expõe cancelamento, invalidação, limpeza e descarte explícitos. `dispose()` elimina integralmente os snapshots e impede novas consultas, cobrindo logout ou encerramento da aplicação. Uma nova instância começa vazia, que é o comportamento esperado após F5.

Cinco testes unitários cobrem isolamento por papel/identidade/versão, cópias defensivas, prévia seguida de revalidação obrigatória, rejeição de resposta antiga, manutenção da prévia em falha, invalidação e descarte. O frontend aprovou 101 testes e o build de produção. Não foi adicionado E2E neste recorte porque a infraestrutura ainda não é consumida por uma tela; a cobertura E2E começa no piloto funcional. Não houve alteração de view ou banco.

Essa infraestrutura fornece os snapshots anterior e novo consumidos pelo reconciliador, sem assumir como cada tela representa seus itens.

### Terceiro recorte — reconciliador de coleções

`reconcileCollection` compara snapshots anterior e novo por uma identidade estável fornecida pelo adaptador da tela. O resultado separa `inserted`, `updated`, `removed`, `moved` e `unchanged`; um mesmo item pode aparecer como movido e atualizado, pois são mudanças independentes que o adaptador DOM precisará aplicar.

A função de igualdade visual também é fornecida pela tela. Assim, diferenças técnicas sem impacto na apresentação podem ser ignoradas sem embutir conhecimento de clientes, propostas ou pagamentos no componente compartilhado. Identidades vazias ou repetidas em qualquer snapshot geram erro explícito, impedindo reconciliação ambígua por posição.

Cinco testes unitários cobrem igualdade visual, inclusão, atualização, remoção, reordenação, atualização combinada com movimento e identidades inválidas. O frontend aprovou 106 testes e o build de produção. Não houve alteração de view, banco ou comportamento visual; por isso, o E2E permanece reservado ao piloto funcional.

Esses deltas são consumidos pelo piloto sem acoplar o componente compartilhado à estrutura DOM da lista de clientes.

### Quarto recorte — piloto na lista administrativa de clientes

`AdminSystemModules` agora possui uma única instância autenticada de `SessionVisualCache` e `VisualPersistenceController`, compartilhada com o módulo de clientes e descartada antes do logout. A sessão administrativa ganhou `subjectId` separado do token; o token continua restrito à autenticação HTTP e nunca entra na chave ou no snapshot visual.

Na segunda visita à listagem, `AdminClientsModule` apresenta o snapshot de forma síncrona e sempre dispara nova consulta. Quando existe prévia, a revalidação solicita o limite fixo de 50 clientes aceito pelo backend, em vez de limitar a consulta à quantidade já armazenada. Isso permite que novos registros entrem no início da ordenação sem expulsar indevidamente clientes antigos da resposta revalidada. Páginas adicionais carregadas atualizam o snapshot agregado até esse limite.

O adaptador da tela usa `client.id` como identidade e compara somente os campos apresentados. Itens iguais preservam o mesmo nó DOM durante a revalidação; inserções, alterações, remoções e movimentos aplicam apenas o delta. Exclusão confirmada reconcilia a tela e invalida o snapshot para impedir reutilização de dados removidos.

Os testes de módulo cobrem segunda visita com requisição pendente, prévia imediata, consulta obrigatória, inclusão recebida do servidor, preservação do nó inalterado e a regressão em que a criação de um terceiro cliente não pode remover o primeiro da lista. O E2E equivalente também preserva explicitamente o cliente mais antigo após a inclusão, mas não foi executado conforme a regra vigente. O frontend aprovou 108 testes e o build de produção. Não houve alteração de view ou banco.

O quinto recorte aplica a persistência visual às propostas administrativas e às etapas/aprovações do cliente, incluindo as invalidações provocadas por decisões e mudanças de etapa.

### Quinto recorte — propostas e aprovações (parte administrativa)

A gestão administrativa de propostas agora usa uma chave isolada por `clientId`, apresenta imediatamente o último snapshot em memória e revalida silenciosamente no servidor. Quando existe prévia, a primeira consulta solicita até 50 propostas para absorver inclusões recentes sem remover indevidamente registros antigos por deslocamento da paginação.

Os cards são reconciliados por `_id`: propostas visualmente inalteradas preservam o mesmo nó DOM, enquanto inclusões, atualizações, remoções e mudanças entre listas abertas e históricas aplicam somente o delta necessário. Páginas adicionais são agregadas ao snapshot. Criação, edição, confirmação de alterações, remoção de anexo e exclusão atualizam o cache somente depois da resposta oficial.

O contrato de `AdminProposalsGateway` passou a aceitar limite opcional, encaminhado como parâmetro de consulta e respeitando o máximo 50 já validado pelo backend. Um teste de módulo cobre a prévia imediata, a inclusão recebida na revalidação e a preservação do card inalterado. O E2E equivalente foi adicionado, mas não executado conforme a regra vigente. O frontend aprovou 109 testes e o build de produção. Não houve alteração de view ou banco.

Na interface do cliente, `ClientSystemModules` mantém uma instância própria do cache, isolada pelo identificador estável retornado em `clientObject`, e a descarta antes do logout. A tela de etapas e aprovações apresenta imediatamente propostas, etapas e etapa atual do snapshot, revalida até 50 propostas e reconcilia os cards por `_id`.

Paginação adicional atualiza o snapshot agregado. Aprovação e solicitação de alteração substituem a proposta e o progresso com a resposta oficial antes de memorizar o novo estado; comentários em edição, arquivos selecionados e conteúdo dos diálogos não entram no cache. O contrato público de propostas passou a aceitar limite opcional na consulta, respeitando o máximo já validado pelo backend.

O teste de módulo cobre prévia imediata, inclusão durante a revalidação e preservação do card inalterado. O E2E equivalente foi adicionado, mas não executado conforme a regra vigente. Ao concluir o quinto recorte, o frontend aprovou 110 testes e o build de produção. Não houve alteração de view ou banco.

A próxima implementação inicia o sexto recorte nos financeiros administrativo e do cliente, mantendo fora do cache BR Code, QR Code, clipboard e dados internos de auditoria.

### Sexto recorte — financeiros (parte administrativa)

O financeiro administrativo agora mantém um snapshot por `clientId` com pagamentos apresentados, paginação e resumo agregado. Na revisita, a tela monta imediatamente o gerenciador com a prévia e revalida até 100 pagamentos, limite já aceito pelo backend, evitando que novas cobranças desloquem registros antigos para fora da resposta.

`ClientFinancialManager` passou a reconciliar cobranças por `payment.id`, preservando cards visualmente inalterados. Criação, edição, remoção, confirmação ou reversão de entrada/parcela, paginação adicional e recuperação de conflito de versão atualizam o snapshot somente depois da resposta oficial. Formulário, prévia em edição, diálogos, temporizadores e registros internos de auditoria permanecem fora do cache.

O resumo global é ajustado por diferença nas mutações, sem ser recalculado apenas a partir da página parcialmente carregada. O teste de módulo cobre a prévia imediata e a preservação do card durante a revalidação. O E2E equivalente foi adicionado, mas não executado conforme a regra vigente. O frontend aprovou 111 testes e o build de produção. Não houve alteração de view ou banco.

No financeiro do cliente, o snapshot guarda somente pagamentos públicos, paginação, resumo e destaque. A tela revalida até 100 pagamentos e reconcilia cards por `payment.id`, preservando os elementos inalterados durante a atualização silenciosa.

Ao gerar um Pix, somente o pagamento atualizado e os metadados públicos `generatedAt` e `analysisWindowEndsAt` presentes no contrato do pagamento/destaque são memorizados. `brCode`, `qrCodeDataUrl`, conteúdo de clipboard, estado do diálogo e temporizadores permanecem exclusivamente no fluxo transitório da tela e nunca entram no snapshot.

Paginação adicional atualiza o snapshot agregado. O teste de módulo cobre a prévia imediata, preservação do card e ausência dos campos secretos no contrato armazenável. O E2E equivalente foi adicionado, mas não executado conforme a regra vigente. Ao concluir o sexto recorte, o frontend aprovou 112 testes e o build de produção. Não houve alteração de view ou banco.

O sétimo e último recorte cobre expansão/auditoria das superfícies restantes, revisão das invalidações, segurança, acessibilidade e encerramento da Etapa 12.

### Sétimo recorte — gestão individual e auditoria final

A gestão individual do cliente passou a armazenar, por `clientId`, somente `AdminClientDetails` e `BriefingReportStatus`. Na revisita, nome, acesso ao Drive e ação do relatório são apresentados imediatamente enquanto cliente e relatório são revalidados. A geração bem-sucedida do relatório atualiza o snapshot com a resposta oficial; falhas continuam oferecendo “Tentar novamente” sem apagar uma prévia válida.

A auditoria confirmou cobertura das seis superfícies elegíveis: lista administrativa de clientes, gestão individual, propostas administrativas, financeiro administrativo, etapas/aprovações do cliente e financeiro do cliente. Shells, homes, criação de cliente, briefing e portfólio público permanecem corretamente fora, conforme o inventário inicial.

As invalidações cruzadas foram fechadas: a exclusão confirmada de cliente limpa todos os snapshots da sessão administrativa; mudanças de etapa realizadas na gestão de propostas invalidam a lista e os detalhes do cliente; decisões do cliente atualizam proposta e progresso no mesmo snapshot; mutações financeiras atualizam seus snapshots somente após resposta oficial. Logout descarta integralmente o controlador de cada papel, enquanto F5 recria toda a composição sem dados anteriores.

A revisão de segurança confirmou que tokens não participam de chaves ou valores, arquivos e formulários em edição não são armazenados e o financeiro do cliente exclui BR Code, QR Code e clipboard. A revisão visual e de acessibilidade mantém foco e nós DOM de itens inalterados, preserva os tratamentos de erro existentes e não introduz anúncios ou indicadores artificiais para a revalidação silenciosa.

O teste de módulo da gestão individual cobre prévia imediata de detalhes e relatório. O E2E equivalente foi adicionado, mas não executado conforme a regra vigente. A validação final aprovou 113 testes frontend, o build de produção e `git diff --check`. Nenhuma view persistida, dado real ou estrutura de banco foi alterada nesta etapa.

Com isso, a Etapa 12 está encerrada. A única etapa priorizada ainda pendente é a Etapa 11, mantida como **aguardando descrição de arquitetura** por decisão do usuário.

### Testes e critérios de conclusão

- testes unitários para isolamento por usuário/papel, versionamento, deduplicação, invalidação, descarte e perda integral após recriação da aplicação;
- testes unitários do delta com objetos iguais, alterados, inseridos, removidos e reordenados;
- testes de módulo garantindo prévia imediata, revalidação obrigatória e proteção contra resposta antiga;
- E2E por tela demonstrando ausência do estado vazio intermediário na segunda visita e atualização apenas dos itens alterados;
- E2E serão adicionados a cada recorte, mas executados somente quando solicitados explicitamente;
- logout e troca de identidade não reutilizam snapshots anteriores;
- falha de rede mantém a prévia sem introduzir indicador específico de atualização, mas não pode ocultar o erro normal da tela;
- nenhum snapshot sobrevive a F5 ou é gravado em APIs de armazenamento do navegador;
- mutações confirmadas não deixam dados antigos visíveis;
- views persistidas no banco continuam sendo a estrutura principal das páginas.

### Decisões definidas em 24/09/2026

- armazenamento somente em propriedades de instâncias em memória;
- nenhuma utilização de `localStorage`, `sessionStorage`, IndexedDB, cookies ou atributos DOM como repositório;
- F5 encerra a validade de todas as prévias;
- todas as telas autenticadas elegíveis do cliente e do administrador fazem parte do escopo;
- não haverá TTL além da vida da aplicação em memória;
- não haverá indicador visual específico de atualização em segundo plano.
