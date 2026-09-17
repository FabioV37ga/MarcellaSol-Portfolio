# Arquitetura do MarcellaSol Portfolio

Última atualização: 14/09/2026.

## 1. Finalidade deste documento

Este arquivo é o contrato arquitetural do sistema. Ele deve ser lido antes de planejar ou implementar qualquer funcionalidade, correção estrutural ou refatoração.

As regras abaixo têm precedência sobre conveniências locais e sobre a repetição de padrões legados. Quando o código existente contrariar este documento, a nova implementação não deve ampliar a divergência. A correção deve ser incremental, compatível e explicitada no planejamento da alteração.

O histórico e a ordem das refatorações ficam em `dev/agent-relatories`. Este arquivo contém somente decisões arquiteturais permanentes.

## 2. Princípios obrigatórios

1. Organizar código por responsabilidade e capacidade funcional, não apenas por tipo técnico.
2. Cada módulo ou componente deve possuir uma responsabilidade principal identificável em uma frase curta.
3. Controllers e agregadores coordenam; regras, persistência, renderização e integrações pertencem aos componentes responsáveis.
4. Dependências devem ser explícitas e recebidas por construtor ou função sempre que possível.
5. Camadas internas não devem depender de detalhes das camadas externas.
6. Alterações devem ser incrementais, preservando contratos e dados existentes.
7. Não duplicar regras de domínio entre frontend, controller, serviço e repositório.
8. Não criar abstrações genéricas antes de existir uma responsabilidade concreta ou repetição comprovada.
9. Toda implementação deve considerar ciclo de vida, falhas parciais, concorrência e compatibilidade com dados legados.
10. Clareza e previsibilidade têm prioridade sobre redução artificial de quantidade de arquivos.

## 3. Paradigma de módulos e componentes

### 3.1. Definição de módulo

Um módulo representa uma tela, fluxo ou capacidade funcional completa. Exemplos:

- `AdminClientsModule`: listagem e ações da tela de clientes;
- `AdminClientFinancialModule`: montagem e ciclo de vida do financeiro administrativo;
- `ClientProposalResponseModule`: interação do cliente ao responder uma proposta;
- `BriefingSubmissionFlow`: preparação e envio do briefing.

Um módulo pode coordenar componentes menores, mas não deve absorver responsabilidades de outras telas ou setores.

### 3.2. Definição de componente

Um componente encapsula comportamento coeso e reutilizável ou complexo o suficiente para ser isolado. Ele deve:

- possuir entradas e dependências claras;
- expor uma API pequena;
- controlar somente os elementos ou dados que lhe pertencem;
- ser testável sem inicializar todo o sistema;
- liberar listeners, timers e requisições quando descartado;
- evitar acesso global quando o elemento ou serviço puder ser recebido como dependência.

Componentização não significa criar um arquivo para cada função. Um novo componente é justificado quando separa uma regra, ciclo de vida, integração ou fluxo que muda por um motivo próprio.

### 3.3. Agregadores, routers e composição

Agregadores como `AdminSystemModules` e `ClientSystemModules` devem apenas:

- receber dependências;
- instanciar ou acessar módulos;
- encaminhar rotas;
- coordenar transições de alto nível.

Eles não devem implementar diretamente:

- chamadas HTTP de uma tela;
- validação de formulários específicos;
- construção de cartões ou diálogos;
- regras financeiras ou de propostas;
- upload e organização de arquivos;
- persistência;
- tratamento detalhado de estados de interface.

A composição do backend pertence a `backend/src/composition`. É ali que implementações concretas são ligadas às portas, serviços e controllers. Serviços de aplicação não devem instanciar infraestrutura concreta quando ela puder ser injetada pela composição. Fachadas compatíveis podem criar um padrão antigo apenas durante uma migração incremental e devem ter remoção planejada.

## 4. Fluxo de dependências

### 4.1. Backend

O fluxo esperado é:

```text
rota → middleware → controller → serviço de aplicação → porta/repositório → infraestrutura
```

- Rotas definem endpoint, autenticação e middlewares.
- Middlewares tratam preocupações HTTP transversais, como autenticação, limites e multipart.
- Controllers traduzem HTTP para comandos e resultados; não contêm regras de negócio.
- Serviços de aplicação executam casos de uso, validações de negócio e compensações.
- Domínio contém regras puras, estados e cálculos sem Express, Mongoose ou Google APIs.
- Repositórios encapsulam consultas e atualizações do MongoDB.
- Serviços de infraestrutura integram Drive, geração de PDF, autenticação externa e recursos técnicos.
- `composition` conecta todas as implementações.

Dependências não devem apontar no sentido inverso. Em particular, domínio e serviços de aplicação não devem importar controllers, rotas ou elementos HTTP.

### 4.2. Frontend

O fluxo esperado é:

```text
router → módulo de tela → componente/fluxo → API de infraestrutura
                     ↘ selector/view/template
```

- Routers controlam URL, histórico e restauração de rota.
- Módulos montam uma tela e coordenam seus componentes.
- Componentes tratam interações coesas, estado local e ciclo de vida.
- APIs de infraestrutura encapsulam `fetch`, autenticação, multipart e parsing de respostas.
- Selectors são o contrato centralizado entre TypeScript e a view persistida.
- Templates TypeScript são usados para itens repetidos gerados a partir de dados, não para reconstruir uma view inteira.
- Views controlam montagem, descarte e estilos de navegação; não contêm regras de negócio.

## 5. Responsabilidade por diretório

### 5.1. Backend

| Diretório | Responsabilidade |
| --- | --- |
| `backend/src/routes` | Endpoints, ordem de middlewares e proteção de rotas. |
| `backend/src/middleware` | Autenticação, rate limit, upload e preocupações HTTP transversais. |
| `backend/src/controllers` | Tradução entre HTTP e casos de uso. |
| `backend/src/application` | Casos de uso e coordenação das regras do sistema. |
| `backend/src/application/ports` | Contratos para relógio, IDs e dependências externas substituíveis. |
| `backend/src/domain` | Regras puras, invariantes e cálculos independentes de framework. |
| `backend/src/models` | Schemas Mongoose e contratos persistidos. |
| `backend/src/repositories` | Consultas, paginação e mutações no MongoDB. |
| `backend/src/services` | Adaptadores técnicos e integrações externas específicas. |
| `backend/src/composition` | Instanciação e ligação das dependências concretas. |
| `backend/src/config` | Leitura e validação de configuração. |
| `backend/src/scripts` | Migrações, auditorias e tarefas operacionais explícitas. |
| `backend/test` | Testes de domínio, aplicação, HTTP, contratos e integrações. |

### 5.2. Frontend

As áreas `frontend/src/admin`, `frontend/src/client` e `frontend/src/portfolio` seguem, quando aplicável, a mesma divisão:

| Diretório | Responsabilidade |
| --- | --- |
| `controllers` | Inicialização e coordenação de alto nível. |
| `navigation` | Rotas, histórico e restauração de página. |
| `modules` | Telas e fluxos funcionais com ciclo de vida próprio. |
| `ui` | Componentes visuais ou comportamentais menores. |
| `infrastructure` | HTTP, parsing de contratos e acesso técnico a armazenamento. |
| `selectors` | Busca tipada e validação dos elementos das views. |
| `templates` | Itens repetidos criados a partir de dados ou fragmentos reutilizáveis. |
| `views` | Montagem e descarte de conteúdo. |
| `styles` | Estilos da área, tela ou componente correspondente. |
| `utils` | Funções pequenas e sem estado que não representam regra de domínio. |

`frontend/src/shared` contém somente contratos e componentes efetivamente compartilhados por duas ou mais áreas. Código específico não deve ser movido para `shared` apenas por conveniência.

## 6. Views persistidas no banco

A estrutura principal das interfaces administrativas e de cliente é carregada do banco de dados.

Regras obrigatórias:

1. `dev/database/*-view.json` é a referência versionada e editável das views persistidas.
2. Toda mudança estrutural da interface deve começar pela referência correspondente em `dev/database`.
3. O TypeScript deve reutilizar os elementos existentes na view.
4. Não reconstruir uma tela persistida com dezenas de `createElement`, atributos e classes.
5. Criação dinâmica é adequada para coleções derivadas de dados, como cartões, linhas, anexos e opções repetidas.
6. IDs, classes e atributos usados pelo TypeScript formam um contrato e devem ser acessados por selectors centralizados.
7. Selectors obrigatórios devem falhar com mensagem que identifique a view e o elemento ausente.
8. Alterações de view devem passar pela validação de contratos antes da sincronização.
9. A entrega deve informar qual arquivo de referência precisa ser sincronizado ou substituído no banco.

Comandos de views:

```bash
npm run views:validate
npm run views:check
npm run views:sync
```

## 7. Regras do frontend

### 7.1. Estado e ciclo de vida

- Estado pertencente a uma tela fica no módulo ou componente da tela.
- Estado persistente deve usar um serviço próprio, como rascunho em `localStorage` ou arquivos no IndexedDB.
- Listeners globais, timers, observers e requisições devem ser removidos ou invalidados no descarte.
- Respostas assíncronas antigas não podem atualizar uma tela que já foi desmontada.
- Botões de submissão devem impedir envios duplicados e restaurar o estado após falha.
- Falhas devem preservar dados preenchidos quando uma nova tentativa for possível.

### 7.2. HTTP

- Componentes e módulos não devem chamar `fetch` diretamente.
- URLs, headers, serialização, `FormData` e parsing pertencem a `infrastructure`.
- APIs devem devolver contratos tipados ou lançar erros com mensagens utilizáveis pela interface.
- Autenticação deve ser aplicada de forma central e consistente.
- Respostas externas devem ser validadas antes de entrar na camada de interface.

### 7.3. Renderização e acessibilidade

- Preferir texto por `textContent` quando houver dados do usuário.
- HTML dinâmico só deve usar `innerHTML` com conteúdo totalmente controlado pelo código.
- Diálogos devem possuir título associado, foco previsível, cancelamento e feedback acessível.
- Controles devem funcionar por teclado e expor estado com atributos ARIA quando aplicável.
- CSS deve ficar próximo da área ou componente, sem seletores globais desnecessários.

## 8. Regras do backend

### 8.1. Controllers

Controllers podem:

- ler parâmetros, query, body, arquivos e principal autenticado;
- transformar formatos HTTP em comandos;
- escolher código de resposta;
- traduzir `ApplicationError` para uma resposta segura.

Controllers não podem:

- realizar consultas Mongoose diretamente;
- implementar regras financeiras, estágios ou propostas;
- organizar pastas do Drive;
- executar rollback de um caso de uso;
- devolver detalhes internos ou segredos em erros.

### 8.2. Serviços de aplicação

- Um serviço representa um caso de uso ou grupo pequeno de operações coesas.
- Validações de negócio ficam próximas do caso de uso.
- Operações com múltiplos efeitos devem ser atômicas por transação ou possuir compensação explícita.
- A ordem das operações e o rollback devem ser cobertos por testes.
- Erros esperados usam `ApplicationError` com código apropriado.
- Logs não devem expor tokens, senhas, chaves Pix, credenciais OAuth ou conteúdo sensível.

### 8.3. Repositórios e persistência

- Repositórios são a única camada que conhece detalhes de consulta Mongoose dentro dos casos de uso.
- Consultas devem filtrar pelo proprietário ou escopo autenticado.
- Listagens com crescimento esperado devem usar paginação por cursor.
- Mutações concorrentes relevantes devem usar versão, condição atômica ou transação.
- Campos legados devem ser lidos de forma compatível até a migração ser comprovada.
- Não alterar silenciosamente formatos que contenham dados reais.

Existem pagamentos reais no banco. Alterações financeiras exigem atenção adicional a compatibilidade, precisão em centavos, histórico, auditoria e reversão.

## 9. Integrações e arquivos

- Cada integração deve possuir um adaptador específico por responsabilidade.
- Operações de propostas no Drive ficam separadas de briefing, relatório e permissões.
- Serviços de aplicação dependem de interfaces pequenas, não do SDK do Google.
- Caminhos de pasta devem ser determinísticos e idempotentes.
- O banco deve guardar identificadores e metadados necessários para localizar e compensar operações.
- Upload concluído sem persistência correspondente deve ser removido ou marcado para recuperação.
- Exclusão no Drive deve preferir lixeira e permitir compensação quando o banco falhar.
- Limites de quantidade e tamanho devem existir no servidor, mesmo que também apareçam na interface.

Estrutura vigente para propostas:

```text
clientes/<cliente>/propostas/<titulo-id>/
├── administrador/
└── cliente/
    ├── resposta-1/
    ├── resposta-2/
    └── ...
```

Os anexos das respostas são históricos e não devem ser sobrescritos por um reenvio posterior.

Fluxo de propostas atualizado em 15/09/2026: a aprovação inicial do cliente permanece; após solicitar alterações, o administrador confirma sua conclusão em diálogo explícito. A proposta passa de `beated` para `changes-completed`, a etapa vinculada passa para `awaiting-client` (Aguardando cliente) e não há nova aprovação do cliente. O reenvio administrativo foi removido; `resent` permanece legível para compatibilidade. A transição deve verificar atomicamente o status anterior, preservar histórico/anexos e compensar falha ao atualizar a etapa.

## 10. Migrações e compatibilidade

Toda mudança de schema, armazenamento externo ou contrato persistido deve definir:

1. leitura compatível do formato anterior;
2. estado final esperado;
3. script de migração quando necessário;
4. modo de prévia sem escrita;
5. opção explícita como `--apply` para executar alterações;
6. resumo de registros encontrados, alterados e com falha;
7. possibilidade de nova execução segura;
8. estratégia de rollback ou recuperação;
9. instruções de execução na VPS.

Migrações nunca devem ser executadas implicitamente durante o boot da aplicação. Dados reais não devem ser apagados ou reescritos sem validação do escopo.

## 11. Estratégia de testes

Cada implementação deve adicionar ou ampliar ao menos um teste E2E que percorra o comportamento afetado pela interface. Essa é uma condição obrigatória de conclusão.

Além do E2E, usar testes proporcionais à responsabilidade:

- domínio: testes puros de regras e invariantes;
- aplicação: casos de sucesso, validação, falhas parciais e rollback;
- repositório: filtros, paginação, atomicidade e compatibilidade;
- controller/HTTP: autenticação, parsing, status e formato da resposta;
- frontend: estado, renderização, lifecycle e contratos de API;
- views: IDs, classes, raiz única e compatibilidade com selectors;
- integração externa: adaptadores simulados nos testes comuns e testes reais somente quando explicitamente habilitados.

Comandos mínimos antes da entrega:

```bash
npm run build
npm test
git diff --check
```

Os testes E2E devem ser criados ou ampliados no mesmo recorte, mas o Codex não deve executar `npm run test:e2e` sem solicitação explícita do usuário. Quando não houver essa solicitação, a entrega deve indicar que o E2E foi adicionado, porém ficou pendente de execução pelo usuário.

Se algum teste não puder ser executado, a entrega deve informar exatamente qual teste faltou e por quê.

## 12. Segurança e privacidade

- Toda rota privada deve validar papel e sessão.
- O identificador do proprietário vem da sessão, nunca de um campo confiado do cliente.
- Uploads devem limitar quantidade e tamanho e tratar nomes como dados não confiáveis.
- URLs e IDs externos devem ser validados antes de operações destrutivas.
- Erros públicos não devem revelar stack, configuração, consultas ou credenciais.
- Tokens e segredos não devem ser gravados no banco em texto aberto, enviados ao frontend ou registrados em logs.
- Alterações destrutivas exigem alvo específico, validação prévia e mecanismo recuperável sempre que possível.

## 13. Nomenclatura e tamanho de escopo

- `*Module`: tela ou fluxo de interface com ciclo de vida.
- `*Flow`: sequência de passos de uma operação de frontend.
- `*Service`: caso de uso ou serviço técnico coeso.
- `*Repository`: persistência de uma entidade ou consulta especializada.
- `*.api.ts`: comunicação HTTP de um recurso ou setor.
- `*.selector.ts`: contrato DOM de uma view.
- `*.template.ts`: criação de itens repetidos a partir de dados.
- `*.storage.ts`: adaptador de armazenamento externo ou local.
- `*.mapper.ts`: transformação pura entre formatos.
- `*.presenter.ts`: criação de contrato de saída sem regra de persistência.

Evitar nomes genéricos como `helper`, `manager`, `utils` ou `service` quando o nome não revela o recurso e a responsabilidade.

Um arquivo grande não é automaticamente incorreto. Deve ser dividido quando possuir partes que:

- mudam por motivos diferentes;
- têm dependências diferentes;
- possuem ciclo de vida independente;
- podem ser testadas isoladamente;
- representam casos de uso ou integrações diferentes.

## 14. Processo para novas implementações

Antes de implementar:

1. Ler este arquivo.
2. Mapear o fluxo atual e os contratos afetados.
3. Identificar a view de referência, dados reais, integrações e compatibilidade legada.
4. Definir o componente dono de cada nova responsabilidade.
5. Perguntar ao responsável pelo produto quando uma decisão alterar experiência, dados, segurança, custos, estrutura externa ou escopo.

Durante a implementação:

1. Alterar a view de referência quando houver mudança estrutural de UI.
2. Implementar o comportamento no menor componente funcional adequado.
3. Manter regras fora de controllers e agregadores.
4. Adicionar compensação para efeitos parciais.
5. Criar ou ampliar testes, incluindo E2E.
6. Preservar alterações não relacionadas existentes no repositório.

Ao concluir:

1. Executar build, testes e validação do diff.
2. Informar arquivos e responsabilidades alterados.
3. Fornecer um fluxo curto de teste manual.
4. Informar sincronizações de view e migrações necessárias.
5. Sugerir uma mensagem de commit.

## 15. Critério de pronto

Uma implementação só está pronta quando:

- a responsabilidade está no módulo, componente ou serviço correto;
- agregadores e controllers continuam apenas coordenando;
- views persistidas e selectors permanecem sincronizados;
- contratos antigos continuam funcionando ou possuem migração explícita;
- falhas parciais possuem comportamento seguro;
- testes unitários ou de aplicação cobrem as regras relevantes;
- existe E2E para o comportamento de interface afetado;
- build e testes executados passam; E2E só é executado mediante solicitação explícita;
- foi fornecido teste manual;
- foi sugerida mensagem de commit;
- documentação arquitetural foi atualizada quando surgiu uma decisão permanente.

## 16. Antipadrões proibidos

- Construir via TypeScript uma tela que pertence a uma view persistida.
- Adicionar regras de negócio a controllers HTTP.
- Adicionar lógica de uma tela diretamente a um agregador de rotas.
- Chamar Google Drive ou Mongoose diretamente do frontend ou controller.
- Misturar anexos de autores ou rodadas diferentes sem metadados de origem.
- Sobrescrever histórico para representar apenas o estado mais recente.
- Criar uma função genérica que conhece briefing, propostas, financeiro e autenticação simultaneamente.
- Fazer migração automática no boot.
- Confiar somente em validação do frontend.
- Entregar comportamento visual novo sem E2E.
- Refatorar e alterar comportamento sem caracterizar primeiro o contrato existente.

## 17. Alteração deste contrato

Uma regra deste arquivo pode ser alterada quando uma necessidade real demonstrar que ela não atende mais ao sistema. A mudança deve:

1. registrar a motivação e as consequências;
2. atualizar este documento no mesmo conjunto de alterações;
3. preservar ou migrar os consumidores existentes;
4. possuir testes que expressem o novo contrato.

Exceções temporárias devem indicar claramente o motivo, o risco, a compatibilidade preservada e o recorte planejado para remoção.
