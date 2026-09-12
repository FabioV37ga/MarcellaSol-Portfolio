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

### Responsabilidade desejada

Manter o portfólio simples, isolando carregamento de projetos, animações e apresentação.

### Componentes propostos

- API de projetos;
- mapper/presenter de projeto;
- carousel de projetos;
- ciclo de vida das animações;
- selectors específicos por página.

### Critério de conclusão

- `app.ts` somente inicializa e compõe;
- animações não mantêm listeners duplicados;
- páginas públicas podem ser construídas sem dependências administrativas;
- aparência responsiva permanece igual.

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
| R3 — módulos administrativos | pendente |
| R4 — briefing do cliente | pendente |
| R5 — briefing administrativo | pendente |
| R6 — Drive e relatório | pendente |
| R7 — persistência e listagens | pendente |
| R8 — cliente, portfólio e CSS | pendente |

## 20. Checklist obrigatório por recorte

- [ ] comportamento e contrato preservados;
- [ ] nenhuma alteração acidental em dados reais;
- [ ] build do projeto afetado;
- [ ] testes automatizados proporcionais ao risco;
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
11. portfólio público.

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
→ portfólio público
```

### Primeiro recorte desta ordem

Começar pelo briefing do cliente, extraindo o armazenamento do rascunho textual de `briefing.controller.ts`. O recorte deve preservar o formato atual do rascunho e do payload enviado, sem alterar as views persistidas. Em seguida, introduzir identificadores estáveis para respostas com leitura compatível do formato legado antes de separar arquivos, coleta e submissão.
