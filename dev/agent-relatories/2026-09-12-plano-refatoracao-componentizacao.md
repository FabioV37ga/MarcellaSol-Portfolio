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
