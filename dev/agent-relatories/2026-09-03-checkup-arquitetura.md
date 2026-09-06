# Checkup da arquitetura do sistema

Data: 03/09/2026  
Escopo: backend, frontend, views persistidas, contratos, testes e operação.

## 1. Objetivo

Este relatório avalia se o desenvolvimento atual continua seguindo a arquitetura já estabelecida no projeto, sem propor sua substituição por uma estrutura nova.

A análise considerou:

- a organização dos diretórios;
- a responsabilidade efetiva dos arquivos;
- o fluxo de dependências entre as camadas;
- as funcionalidades recentes de etapas, propostas, remoção e listagem de clientes;
- a forma como as views armazenadas no MongoDB são utilizadas;
- a cobertura automatizada e o processo de build.

Os arquivos `dev/Organização.txt` e `dev/Requisitos.txt` descrevem tarefas e requisitos, mas não constituem uma especificação formal da arquitetura. Por isso, o padrão inicial foi inferido a partir da estrutura e das dependências existentes no próprio código.

Nenhum arquivo da aplicação foi alterado durante o checkup.

## 2. Resumo executivo

**Nota geral: 7,5/10.**

A arquitetura atual é viável e coerente para o tamanho do sistema. Ela se comporta como um monólito modular em camadas, com separação razoavelmente clara entre interface, aplicação, persistência e integrações externas.

As funcionalidades recentes seguem, em sua maioria, o padrão estabelecido. Não há justificativa técnica para uma refatoração total. As melhorias necessárias são localizadas e podem ser feitas progressivamente enquanto novas funcionalidades forem desenvolvidas.

O principal risco atual não é a estrutura de diretórios. É a concentração crescente de responsabilidades em poucos arquivos e o contrato ainda incompleto das views persistidas.

## 3. Arquitetura identificada

### Backend

| Diretório | Responsabilidade predominante | Avaliação |
| --- | --- | --- |
| `backend/src/routes` | Declarar endpoints e aplicar middlewares | Boa |
| `backend/src/controllers` | Converter requisições HTTP em comandos e respostas | Boa, com alguns acessos diretos à persistência |
| `backend/src/application` | Casos de uso, validações e regras de negócio | Muito boa |
| `backend/src/repositories` | Acesso ao MongoDB | Boa |
| `backend/src/models` | Schemas do Mongoose e regras relacionadas ao domínio | Boa, embora reúna dois tipos de responsabilidade |
| `backend/src/services` | Google Drive, senhas, sessões, e-mails e relatórios | Boa |
| `backend/src/middleware` | Autenticação, segurança, uploads e tratamento de borda | Boa |

O fluxo predominante é:

`rota → controller → serviço de aplicação → repositório/serviço externo → modelo`

Esse fluxo está claro nas funcionalidades recentes e é adequado para o projeto.

### Frontend

| Diretório | Responsabilidade predominante | Avaliação |
| --- | --- | --- |
| `frontend/src/admin` | Funcionalidades exclusivas da administração | Boa |
| `frontend/src/client` | Jornada e funcionalidades do cliente | Boa |
| `frontend/src/portfolio` | Site público | Boa |
| `frontend/src/shared` | Contratos e comportamentos compartilhados | Boa |
| `infrastructure` | Comunicação com o backend e armazenamento local | Boa |
| `modules` | Orquestração das telas e dos casos de interação | Correta, mas concentrada |
| `selectors` | Contrato entre o HTML e o comportamento | Boa |
| `templates` | Hidratação de templates e criação de conteúdo dinâmico | Boa |
| `views` | Montagem, desmontagem e estado visual global | Boa, com ciclo de vida compartilhado |

### Views persistidas

Os documentos de `dev/database` funcionam como representação versionada das views armazenadas no MongoDB. A abordagem é compatível com o restante do sistema, desde que esses arquivos sejam tratados como código e tenham sincronização controlada com o banco.

Existem comandos de validação, conferência e sincronização idempotente. Ainda faltam validação estrutural do HTML, detecção completa de drift e índice único no banco.

## 4. Aderência das funcionalidades recentes

### Etapas e status na listagem de clientes

A implementação segue corretamente as camadas existentes:

- `ListClientsService` calcula a etapa e o status apresentados ao administrador;
- `ClientRepository` fornece a projeção necessária do cliente;
- `AdminSystemApi` declara o contrato consumido pelo frontend;
- `client-list-item.template.ts` preenche os dados dinâmicos;
- `admin-clients-view.json` permanece responsável pelo HTML estrutural da tela.

Essa divisão está alinhada ao padrão do projeto.

### Remoção de clientes

A remoção segue o fluxo esperado:

`adminRoutes → AdminController → DeleteClientService → ClientDeletionRepository/Google Drive`

Pontos positivos:

- confirmação exata do nome no frontend e no backend;
- exclusão transacional dos dados internos relacionados;
- envio da pasta do cliente para a lixeira do Drive;
- compensação para restaurar a pasta se a exclusão do banco falhar;
- markup do diálogo e da linha definido na view persistida.

A transação do MongoDB pressupõe que o ambiente utilize replica set ou uma implantação compatível com transações. Essa dependência operacional deve ser documentada.

### Ordem das etapas por cliente

A regra está persistida no documento do cliente e atualizada por identificador individual. A lógica de normalização, ordenação e status está centralizada em `backend/src/models/projectStage.ts`.

A clonagem foi generalizada para todas as views persistidas, eliminando a exceção local da tela de propostas. A regra de negócio continua individual e o ciclo de vida da interface agora descarta árvores, timers e listeners globais por montagem.

## 5. Pontos fortes

- Regras importantes de etapas estão centralizadas, em vez de espalhadas por controllers e telas.
- Casos de uso relevantes possuem serviços próprios em `backend/src/application`.
- Repositórios isolam a maior parte do acesso ao MongoDB.
- Dependências são recebidas pelos construtores dos serviços, facilitando testes e substituições.
- Admin, cliente e portfólio possuem contextos separados no frontend.
- A comunicação HTTP recente está concentrada nas camadas de infraestrutura.
- Autenticação, sessões, uploads, rate limiting e headers defensivos possuem componentes separados.
- Há compensações para operações que envolvem simultaneamente MongoDB e Google Drive.
- O backend compila e os 26 testes existentes passam.
- O frontend compila e o build de produção é gerado.

## 6. Dívidas arquiteturais

### 6.1 `AdminSystemModules` concentra funcionalidades demais

`frontend/src/admin/modules/admin-system.modules.ts` possui aproximadamente 589 linhas e coordena:

- navegação inicial;
- listagem e remoção de clientes;
- gestão individual do cliente;
- relatórios de briefing;
- propostas e anexos;
- editor de etapas;
- início da criação de clientes.

O arquivo ainda é compreensível, mas cada nova funcionalidade aumenta o risco de interferência entre telas. O problema de listeners associados a clientes visitados anteriormente foi um exemplo desse tipo de acoplamento.

Não é necessário substituí-lo de uma vez. As telas `clients`, `client-management` e `client-proposals` podem ser extraídas gradualmente para módulos próprios dentro da estrutura atual.

### 6.2 O pipeline das views persistidas ainda é incompleto

Os JSONs de `dev/database` são sincronizados por comandos próprios. O pipeline ainda não consegue:

- validar o schema dos documentos;
- validar o HTML;
- garantir unicidade por `permission`, `type` e `viewName`;
- detectar drift entre os ambientes.

Isso cria duas possíveis fontes da verdade: o arquivo versionado e o documento atualmente implantado.

A recomendação não é retirar as views do MongoDB, mas adicionar validação e sincronização ao fluxo já utilizado.

### 6.3 Serviços e controllers grandes

`backend/src/application/client-proposal.service.ts` concentra criação, edição, reenvio, aprovação, solicitação de alterações, exclusão, anexos, compensações do Drive e sincronização de etapas.

`frontend/src/client/controllers/briefing.controller.ts` concentra montagem das páginas, navegação, cache, arquivos, validação e submissão do briefing.

Ambos podem continuar funcionando como estão. A extração deve ocorrer apenas quando essas áreas voltarem a receber alterações, reduzindo risco e evitando uma refatoração ampla sem benefício imediato.

### 6.4 Pequenos desvios entre camadas

Alguns controllers acessam repositórios e modelos diretamente. Por exemplo, `ClientController` consulta `ClientRepository` e chama a normalização de etapas para montar a resposta de aprovações.

Isso não compromete o sistema, mas é diferente do fluxo predominante baseado em serviços de aplicação. Novas regras de negócio devem continuar sendo colocadas em `application`, evitando ampliar esse desvio.

Também existem usos diretos do Mongoose em serviços de aplicação apenas para validar ou criar `ObjectId`. É um acoplamento aceitável no projeto atual, mas deve ser evitado em regras que não dependam realmente do MongoDB.

### 6.5 Contratos duplicados entre backend e frontend

Chaves e status de etapas existem no backend e no frontend. Essa duplicação pode causar divergência silenciosa quando um lado for alterado sem o outro.

Não é necessário criar um pacote compartilhado imediatamente. Um teste de contrato ou schema gerado já reduziria significativamente o risco.

### 6.6 Cobertura automatizada desequilibrada

Os testes atuais verificam autenticação, propostas, etapas, remoção e listagem. Porém, todos permanecem em `backend/test/security.test.mjs`, mesmo quando não tratam de segurança.

O frontend agora possui Vitest, jsdom e regressões do ciclo de vida das views e do menu mobile administrativo. Ainda faltam:

- ampliar testes DOM por domínio;
- testes do contrato dos JSONs;
- integração com MongoDB para operações transacionais;
- validação automatizada das fixtures.

Os testes podem ser separados por assunto sem mudar a infraestrutura atual baseada no test runner nativo do Node.

### 6.7 Operação e código legado

Foram encontrados alguns pontos que não exigem mudança arquitetural, mas prejudicam a confiabilidade:

- `/api/test` e o modelo `Projeto` aparentam ser código de desenvolvimento legado;
- o schema de cliente não define índice único para `login`;
- a configuração CORS ainda reúne origens de desenvolvimento e produção;
- o build do frontend avisa sobre caminhos CSS antigos em `projects.html`;
- não há scripts de lint, testes de frontend ou CI no `package.json` raiz.

## 7. Plano incremental recomendado

A prioridade de estabilidade das views foi concluída em 06/09/2026. O frontend passou a criar uma árvore DOM por montagem, desmontar views com descarte explícito de recursos e executar testes DOM de regressão. O menu mobile administrativo também foi completado com o mesmo comportamento da área do cliente.

### Prioridade 2 — controle das views persistidas

1. Ampliar o validador para nomes conhecidos e HTML básico.
2. Adicionar versão ou checksum para detectar drift.
3. Garantir índice único adequado na coleção de views.

### Prioridade 3 — modularização por oportunidade

1. Extrair a tela de propostas de `AdminSystemModules` quando ela receber nova alteração.
2. Extrair a listagem/remoção de clientes em uma alteração posterior.
3. Separar partes do briefing somente quando o fluxo voltar a ser modificado.
4. Evitar refatorações simultâneas de áreas estáveis.

### Prioridade 4 — testes e contratos

1. Dividir `security.test.mjs` por domínio.
2. Adicionar testes DOM para admin e cliente.
3. Adicionar validação das fixtures ao comando de teste ou build.
4. Criar verificação de compatibilidade dos status e etapas entre backend e frontend.

### Prioridade 5 — inicialização e limpeza

1. Documentar a exigência de transações/replica set.
2. Remover ou proteger `/api/test`.
3. Remover o modelo legado `Projeto` se ele não tiver uso real.
4. Corrigir os caminhos CSS apontados pelo build.
5. Separar CORS por ambiente.

## 8. Critérios para novas funcionalidades

Para preservar a arquitetura existente, novas funcionalidades devem seguir estas regras:

- estrutura visual permanente deve estar na view correspondente;
- templates TypeScript devem criar somente elementos realmente dinâmicos ou hidratar templates da view;
- interação e coordenação de tela pertencem aos módulos/UI;
- requisições HTTP pertencem à camada `infrastructure`;
- regras de negócio pertencem a serviços de `application` ou aos módulos de domínio já existentes;
- persistência pertence aos repositórios;
- acesso ao Drive e outros recursos externos pertence aos serviços;
- toda funcionalidade que depende de um cliente deve receber e utilizar explicitamente seu identificador;
- views reutilizadas não devem carregar estado ou listeners de uma montagem anterior.

## 9. Resultado das verificações

- Build do backend: aprovado.
- Testes do backend: 26 aprovados, nenhuma falha.
- Build do frontend: aprovado.
- JSONs de `dev/database`: válidos.
- Avisos de build: caminhos CSS antigos em `projects.html` não resolvidos durante o build.

## 10. Conclusão

O projeto não precisa de uma nova arquitetura. A estrutura originalmente adotada continua adequada, e o desenvolvimento recente a respeitou de forma satisfatória.

O momento atual pede refatoração incremental e localizada, principalmente no frontend administrativo e na sincronização das views persistidas. Essas melhorias cabem integralmente na organização existente.

Se as telas maiores forem divididas conforme forem modificadas e o processo das views for automatizado, a arquitetura poderá sustentar a próxima fase do sistema sem reescrita geral.

---

## 11. Atualização da varredura — 05/09/2026

### 11.1 Escopo desta atualização

Esta seção atualiza o diagnóstico depois da implementação do financeiro administrativo, visualização financeira do cliente, geração provisória de Pix estático, auditoria financeira, rate limiting financeiro e automação das views do MongoDB.

Foi realizada uma nova leitura das camadas de backend, frontend e dos artefatos em `dev/database`. Depois da varredura, as correções de integridade dos pagamentos, configuração Pix e remoção administrativa de cobranças foram incorporadas ao estado descrito neste relatório.

Verificações executadas no estado atual:

- build do backend: aprovado;
- testes do backend: 40 aprovados, nenhuma falha;
- build do frontend: aprovado;
- validação local das views: 8 arquivos válidos;
- avisos do build frontend: os sete caminhos CSS antigos de `projects.html` continuam sem resolução no momento do build.

### 11.2 Avaliação geral atualizada

**Nota arquitetural atual: 7,3/10.**

O sistema continua sendo um monólito modular em camadas, adequado ao tamanho atual. A implementação financeira respeitou o fluxo principal:

`rota → controller → serviço de aplicação → repositório/modelo`

Também foram introduzidos controles positivos: valores monetários persistidos em centavos, validação no backend, concorrência otimista por versão, auditoria de mutações, isolamento pelo `clientId` obtido da sessão, rate limiting e uma implementação separada para montar o BR Code Pix.

A redução da nota em relação ao checkup anterior não representa regressão geral. Ela reflete o aumento da criticidade do domínio: uma estrutura aceitável para telas e propostas precisa de garantias adicionais quando passa a representar valores pagos, saldo devedor e histórico financeiro.

O sistema financeiro atual deve continuar sendo tratado como **provisório**, não como razão contábil ou integração de pagamentos definitiva.

### 11.3 Situação dos achados anteriores

| Achado anterior | Situação em 05/09/2026 | Observação |
| --- | --- | --- |
| Resolução de views por índice | Resolvido | Admin e cliente agora resolvem por `viewName`. |
| Ausência de automação das views | Parcialmente resolvido | Existem `views:validate`, `views:check` e `views:sync`, com upsert idempotente. Ainda faltam validação estrutural do HTML, detecção completa de drift e índice único no banco. |
| Testes concentrados apenas em segurança | Parcialmente resolvido | Há um arquivo separado para Pix, mas a maior parte dos testes de domínio continua em `security.test.mjs`. |
| Endpoint `/api/test` público | Parcialmente resolvido | Agora exige autenticação administrativa, porém segue montado em produção e o site público continua chamando-o sem token. |
| Inicialização do MongoDB antes do servidor | Resolvido | O bootstrap agora aguarda a conexão antes de registrar as rotas e abrir a porta HTTP. |
| Ciclo de vida das views | Resolvido em 06/09/2026 | Admin e cliente usam uma árvore nova por montagem, `replaceChildren` e callbacks de descarte para timers e listeners globais. |
| Contratos duplicados frontend/backend | Não resolvido | Etapas, propostas e financeiro continuam declarados separadamente. |
| Semântica dos status de proposta | Não resolvido | `beated` e `Cancelled` continuam no contrato atual. |
| Código legado e logs de desenvolvimento | Não resolvido | A página pública ainda executa `checkHealth()` e `testApi()` e cria elementos de diagnóstico no DOM. |

### 11.4 Novos achados e inconsistências

#### ARQ-026 — `ClientPaymentService` reúne domínio, DTO e geração de imagem

Prioridade: **média-alta**
Tipo: responsabilidade por arquivo

O arquivo possui aproximadamente 480 linhas e hoje executa:

- parsing e validação dos campos HTTP;
- cálculo do plano financeiro;
- mutações administrativas;
- autorização contextual por cliente;
- geração e renovação de tentativa Pix;
- geração de PNG/Data URL com a biblioteca `qrcode`;
- montagem de DTO administrativo e DTO público;
- criação dos eventos de auditoria.

O algoritmo de BR Code já está adequadamente isolado em `services/pix-br-code.ts` e a configuração do recebedor agora é injetada. O caso de uso principal, porém, ainda depende diretamente da geração do QR Code.

Extração incremental sugerida:

- `payment-schedule.ts`: cálculo puro e datas;
- `payment-presenter.ts`: DTOs de admin e cliente;
- `pix-charge.service.ts`: janela temporária, BR Code e imagem;
- manter `ClientPaymentService` como orquestrador, ou dividi-lo por casos de uso quando voltar a ser alterado.

#### ARQ-027 — regras financeiras estão duplicadas e posicionadas na camada visual

Prioridade: **média-alta**
Tipo: duplicação de regra de negócio

O cálculo oficial está no backend, mas `client-financial-manager.ts` repete cálculo de desconto, entrada, juros, distribuição de centavos e vencimentos para a prévia administrativa. O frontend do cliente também define sozinho:

- qual pagamento recebe destaque;
- a regra dos 28 dias;
- prioridade entre pago, em análise, pendente e atrasado;
- cálculo textual de dias até o vencimento.

Essas regras aparecem em arquivos de template/UI, e não há testes DOM do frontend. Uma alteração isolada pode fazer a prévia divergir do que será salvo ou admin e cliente exibirem estados diferentes.

Direção recomendada:

- manter o backend como autoridade dos valores;
- retornar uma prévia calculada por endpoint, ou compartilhar funções puras sem duplicação;
- mover seleção de destaque e classificação temporal para um módulo de domínio/apresentação testável, fora do template DOM;
- usar um relógio injetável nos testes para regras baseadas em data.

#### ARQ-028 — “expiração do Pix” significa apenas janela de exibição

Prioridade: **média-alta por semântica de produto**
Tipo: modelagem/linguagem

O BR Code atual é estático e não contém uma expiração bancária. `expiresAt` controla somente:

- por quanto tempo o backend devolve a tentativa existente;
- por quanto tempo o frontend mostra “Em análise” e permite reabrir o QR.

Um código copiado pode continuar sendo pago depois das cinco horas. Portanto, os nomes e mensagens não devem sugerir que a cobrança deixou de ser válida na rede Pix.

Direção recomendada: nomear o conceito como `displayExpiresAt`, `analysisWindowEndsAt` ou “janela de exibição/análise”. Uma expiração real somente deve ser prometida quando houver cobrança dinâmica emitida por um PSP/banco.

#### ARQ-029 — modelo financeiro mistura plano de cobrança, pagamento e tentativa Pix

Prioridade: **média**
Tipo: semântica do domínio

`ClientPayment` representa, na prática, um plano/cobrança com entrada e parcelas. Cada parte também é chamada de pagamento. O mesmo agregado guarda termos comerciais, vencimentos, confirmação manual, tentativa Pix atual e todo o histórico de eventos.

Outras ambiguidades:

- `firstDueDate` é a data da entrada/início; a Parcela 1 vence um mês depois;
- `settlementSource` admite `pix`, embora a implementação atual confirme apenas manualmente;
- a collection se chama `financeiro`, enquanto os campos e o código usam inglês;
- não existe campo explícito de moeda, apesar de toda a aplicação assumir BRL.

Não é necessário renomear imediatamente. Antes de integrar um PSP, definir vocabulário estável, por exemplo: `ClientCharge`, `ChargeSchedule`, `PaymentReceipt` e `PixPresentationAttempt`.

#### ARQ-030 — histórico e payloads expirados crescem no documento principal

Prioridade: **média**
Tipo: persistência/escalabilidade

Cada nova geração após cinco horas sobrescreve `part.pix`, mas adiciona permanentemente um evento em `events`. O array não possui limite, paginação ou coleção própria. O BR Code expirado também permanece no documento até ser sobrescrito, editado ou a parte ser marcada manualmente.

Isso não é um risco imediato com poucos clientes, mas um documento MongoDB possui limite de tamanho e a auditoria tende a crescer justamente no agregado mais consultado.

Direção recomendada:

- mover eventos financeiros para coleção append-only com índice por `paymentId`;
- manter no agregado apenas estado atual e, se necessário, os últimos eventos;
- definir retenção para tentativas Pix e nunca usar TTL sobre o documento da cobrança inteira.

#### ARQ-031 — listagem financeira possui truncamento silencioso

Prioridade: **média**
Tipo: contrato/paginação

`ClientPaymentRepository.findByClientId()` aplica `.limit(200)` sem cursor, contagem ou indicação de truncamento. Admin e cliente tratam o retorno como lista completa e o cliente usa toda a lista para escolher o destaque.

Direção recomendada: definir paginação explícita e fornecer separadamente o resumo/destaque atual. Enquanto o volume for pequeno, ao menos documentar o limite no contrato para que ele não seja confundido com ausência de dados.

#### ARQ-032 — `type` das views não possui taxonomia confiável

Prioridade: **média**
Tipo: semântica/configuração

Nos arquivos atuais, `type` assume `system`, `client` e `financial`. O frontend resolve as telas por `viewName` e seus contratos `dbView`/`DbView` nem declaram `type`. No backend, o campo é usado pontualmente para localizar views administrativas de briefing.

Assim, `type` parece simultaneamente categoria técnica, domínio e filtro operacional, mas não é validado por enum nem consumido de forma uniforme.

Direção recomendada: decidir se `type` representa domínio, grupo de carregamento ou espécie de template. Depois, definir enum e validar combinações permitidas com `permission` e `viewName`; se não possuir função real, removê-lo mediante migração.

#### ARQ-033 — automação das views é útil, porém ainda não fecha o contrato

Prioridade: **média**
Tipo: tooling/integração

O novo script é um avanço concreto: valida JSON, ObjectId, campos obrigatórios e duplicidade local, compara por `permission + viewName` e aplica insert/update sem remoção.

Limitações atuais:

- não analisa HTML malformado;
- não valida IDs/classes exigidos pelos selectors;
- não confirma que todas as views obrigatórias existem;
- não reporta como drift as views extras presentes apenas no banco;
- não cria/verifica índice único em `(permission, viewName)`;
- não possui checksum ou versão de schema;
- `views:validate` não faz parte do `build` raiz nem de CI.

A automação deve ser descrita como sincronização unidirecional conservadora, e não como garantia completa de equivalência repositório ↔ banco.

#### ARQ-034 — endpoints de diagnóstico permanecem fora do fluxo esperado

Prioridade: **média-alta operacional**
Tipo: código legado

- `/api/test` continua registrado em todas as execuções, embora protegido como admin;
- o site público chama `/health` e `/test` ao carregar a home;
- `testApi()` não envia token, portanto a chamada protegida é estruturalmente incapaz de obter sucesso;
- os utilitários criam caixas de diagnóstico no DOM público e mantêm logs de desenvolvimento.

Direção recomendada: separar readiness de health, montar rotas de teste somente em desenvolvimento e retirar `testRequisitions.ts` do entry público.

#### ARQ-035 — contratos e nomenclatura continuam divergentes

Prioridade: **média**
Tipo: contratos/semântica

Exemplos ainda ativos:

- status de proposta `beated` e `Cancelled`, misturando inglês inadequado e caixa;
- interfaces financeiras repetidas no backend, `admin-system.api.ts` e `client-system.api.ts`;
- chaves/status de etapas duplicados entre backend e `frontend/src/shared`;
- `home.selector.ts.ts` mantém extensão duplicada;
- `AdminController` concentra 339 linhas e tratamento repetido de erros por domínio.

Direção recomendada: estabilizar contratos via schema compartilhado ou geração de tipos, normalizar status mediante migração explícita e corrigir nomes oportunisticamente, sem uma refatoração transversal única.

### 11.5 Pontos positivos das novas implementações

- Valores persistidos como inteiros em centavos evitam a maior parte dos erros comuns de ponto flutuante no estado oficial.
- O backend recalcula valores em vez de confiar na prévia enviada pelo navegador.
- Mutações financeiras usam versão otimista e retornam conflito quando o agregado mudou.
- Condições financeiras e vencimentos ficam bloqueados depois do primeiro recebimento confirmado, impedindo recálculo retroativo do valor pago.
- Alterações de status recebidas pela edição geral são ignoradas; confirmações e reversões permanecem nas operações específicas com auditoria.
- A remoção administrativa de pagamentos é lógica, preserva a auditoria e exige confirmação reforçada quando existe histórico de recebimento.
- Consultas e mutações vinculam cobrança ao cliente, reduzindo risco de acesso horizontal.
- Confirmações manuais registram instante e origem, e as mutações relevantes geram auditoria.
- A confirmação administrativa remove a tentativa Pix ativa da parte correspondente.
- O DTO do cliente omite versão, `clientId` e cálculos internos que ele não precisa editar.
- O BR Code foi isolado em função testável e possui teste de valor exato e CRC.
- A configuração Pix é validada antes da composição da aplicação, não possui fallback no código e é injetada no serviço.
- O servidor aguarda a conexão com o MongoDB antes de registrar as rotas e aceitar requisições.
- Admin financeiro recebeu um componente próprio (`ClientFinancialManager`), melhor do que ampliar toda a lógica dentro de `AdminSystemModules`.
- O processo de views agora possui comandos documentados, modo somente leitura e aplicação explícita.

### 11.6 Ordem recomendada para as próximas correções

#### Antes de ampliar o financeiro

1. Extrair regras financeiras duplicadas e adicionar testes do frontend.
2. Renomear a janela Pix para refletir que a validade é apenas interna.

#### Antes de integrar banco ou PSP

1. Separar cobrança planejada de recebimento confirmado.
2. Definir idempotência por cobrança/parcela e identificador externo.
3. Projetar webhook autenticado, reconciliação e estados explícitos (`pending`, `presented`, `confirmed`, `failed`, `refunded`).
4. Tornar eventos financeiros append-only e consultáveis sem crescimento ilimitado do agregado.
5. Definir moeda, timezone de negócio e política de alteração/cancelamento.

#### Manutenção estrutural

1. Tornar `views:validate` obrigatório no pipeline do repositório.
2. Criar índice único das views após eliminar duplicidades existentes.
3. Extrair o módulo financeiro do cliente de `ClientSystemModules`, assim como foi feito no admin.
4. Remover diagnóstico do entry público.
5. Separar testes por domínio e adicionar integração MongoDB/HTTP.

### 11.7 Conclusão atualizada

A arquitetura-base permanece aproveitável e não precisa ser substituída. As novas funcionalidades confirmam que a divisão em routes, controllers, application, repositories, models e services funciona bem quando seguida de forma consistente.

O bloqueio dos termos após o primeiro recebimento protege o fluxo manual atual contra recálculo retroativo. Antes de automatizar a confirmação bancária, ainda será necessário separar **plano de cobrança**, **recebimento confirmado** e **apresentação temporária de Pix**, além de definir idempotência e vocabulário explícito.

No frontend, o ciclo de vida das views persistidas foi padronizado. O próximo risco relevante é a duplicação das regras financeiras entre backend e frontend, seguida pela semântica imprecisa da janela Pix.

Este relatório continua sendo diagnóstico. Ele não autoriza a aplicação automática das correções listadas.

---

## 12. Resumo dos pontos a melhorar por prioridade

A arquitetura continua adequada e não precisa ser reescrita. As melhorias devem ser incrementais, começando agora pela eliminação de regras financeiras duplicadas no frontend.

### 1. Eliminar divergências nas regras financeiras

Parte dos cálculos e da classificação dos pagamentos está duplicada no frontend. O backend deve continuar sendo a autoridade dos valores. Recomenda-se:

- disponibilizar uma prévia calculada pelo backend ou compartilhar funções puras;
- retirar regras financeiras dos templates DOM;
- tornar as regras baseadas em data testáveis com um relógio injetável;
- adicionar testes de frontend.

### 2. Corrigir a semântica da expiração do Pix

O Pix atual é estático e não expira na rede bancária. O prazo de cinco horas representa apenas uma janela interna de exibição ou análise. Campos e mensagens devem usar termos como `displayExpiresAt`, `analysisWindowEndsAt` ou "janela de exibição/análise".

### 3. Preparar o domínio antes de integrar banco ou PSP

Antes de automatizar pagamentos, será necessário:

- separar o plano de cobrança dos recebimentos confirmados;
- implementar idempotência e identificadores externos;
- projetar webhook autenticado e reconciliação;
- definir estados explícitos de pagamento;
- definir moeda, timezone e políticas de alteração, cancelamento e reembolso;
- manter eventos financeiros imutáveis e fora do documento operacional principal.

### 4. Corrigir os diagnósticos de produção

- separar health check de readiness;
- montar `/api/test` somente em desenvolvimento;
- retirar chamadas, logs e elementos de diagnóstico da página pública.

### 5. Completar o controle das views persistidas

A automação atual é útil, mas ainda não garante equivalência completa entre o repositório e o MongoDB. Deve-se:

- tornar `views:validate` obrigatório no build ou CI;
- validar HTML e os IDs/classes exigidos pelos selectors;
- detectar views ausentes e extras;
- criar índice único para `(permission, viewName)`;
- adicionar versão ou checksum para detectar drift.

### 6. Melhorar a paginação e o armazenamento financeiro

- substituir o limite silencioso de 200 registros por paginação explícita;
- fornecer separadamente o resumo ou destaque financeiro atual;
- mover o histórico para uma coleção append-only;
- definir retenção para tentativas Pix expiradas.

### 7. Modularizar arquivos grandes por oportunidade

Essa melhoria deve acompanhar futuras alterações, sem uma refatoração transversal imediata:

- dividir responsabilidades de `ClientPaymentService`;
- extrair o financeiro de `ClientSystemModules`;
- continuar decompondo `AdminSystemModules`;
- separar cálculo, apresentação e Pix em componentes próprios.

### 8. Organizar testes, contratos e nomenclaturas

- separar os testes por domínio;
- adicionar testes DOM, MongoDB e HTTP;
- compartilhar ou gerar contratos entre backend e frontend;
- normalizar nomes como `beated`, `Cancelled` e `home.selector.ts.ts`;
- definir uma taxonomia clara para o campo `type` das views.

Em síntese, os primeiros trabalhos pendentes são a eliminação das regras financeiras duplicadas e a correção da semântica da janela Pix. Em seguida, devem ser tratadas a preparação para integração com PSP e a confiabilidade operacional.
