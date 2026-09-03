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

O principal risco atual não é a estrutura de diretórios. É a concentração crescente de responsabilidades em poucos arquivos e a ausência de um ciclo de vida uniforme para as views recebidas do banco.

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
| `views` | Montagem, desmontagem e estado visual global | Precisa de padronização |

### Views persistidas

Os documentos de `dev/database` funcionam como representação versionada das views armazenadas no MongoDB. A abordagem é compatível com o restante do sistema, desde que esses arquivos sejam tratados como código e tenham sincronização controlada com o banco.

Atualmente essa sincronização é manual, o que permite divergência entre o repositório e o ambiente implantado.

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

A correção recente que clonou a view de propostas resolveu o compartilhamento acidental de DOM e listeners entre clientes. A regra de negócio já era individual; o vazamento acontecia no ciclo de vida da interface.

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

### 6.2 O ciclo de vida das views não é uniforme

O getter administrativo converte cada string vinda do banco em uma instância de `HTMLElement`. Em seguida, `AdminSystemView.render` anexa essa mesma instância ao DOM.

Isso significa que estado visual, ordem de elementos e listeners podem permanecer na instância entre montagens. A tela de propostas precisou executar `cloneNode(true)` explicitamente para impedir esse comportamento entre clientes.

A melhoria recomendada é estabelecer uma única regra:

- telas transitórias devem receber uma nova árvore DOM a cada montagem;
- listeners globais devem possuir descarte explícito;
- `render` e `unrender` devem usar uma implementação consistente, preferencialmente com `replaceChildren`.

Essa alteração mantém a view responsável pela estrutura visual e não exige trocar o modelo arquitetural atual.

### 6.3 As views do banco não possuem pipeline de sincronização

Os JSONs de `dev/database` são referências manuais. Não existe um comando automatizado para:

- validar o schema dos documentos;
- validar o HTML;
- garantir unicidade por `permission`, `type` e `viewName`;
- comparar o conteúdo local com o MongoDB;
- aplicar um upsert idempotente;
- detectar drift entre os ambientes.

Isso cria duas possíveis fontes da verdade: o arquivo versionado e o documento atualmente implantado.

A recomendação não é retirar as views do MongoDB, mas adicionar validação e sincronização ao fluxo já utilizado.

### 6.4 Serviços e controllers grandes

`backend/src/application/client-proposal.service.ts` concentra criação, edição, reenvio, aprovação, solicitação de alterações, exclusão, anexos, compensações do Drive e sincronização de etapas.

`frontend/src/client/controllers/briefing.controller.ts` concentra montagem das páginas, navegação, cache, arquivos, validação e submissão do briefing.

Ambos podem continuar funcionando como estão. A extração deve ocorrer apenas quando essas áreas voltarem a receber alterações, reduzindo risco e evitando uma refatoração ampla sem benefício imediato.

### 6.5 Pequenos desvios entre camadas

Alguns controllers acessam repositórios e modelos diretamente. Por exemplo, `ClientController` consulta `ClientRepository` e chama a normalização de etapas para montar a resposta de aprovações.

Isso não compromete o sistema, mas é diferente do fluxo predominante baseado em serviços de aplicação. Novas regras de negócio devem continuar sendo colocadas em `application`, evitando ampliar esse desvio.

Também existem usos diretos do Mongoose em serviços de aplicação apenas para validar ou criar `ObjectId`. É um acoplamento aceitável no projeto atual, mas deve ser evitado em regras que não dependam realmente do MongoDB.

### 6.6 Contratos duplicados entre backend e frontend

Chaves e status de etapas existem no backend e no frontend. Essa duplicação pode causar divergência silenciosa quando um lado for alterado sem o outro.

Não é necessário criar um pacote compartilhado imediatamente. Um teste de contrato ou schema gerado já reduziria significativamente o risco.

### 6.7 Cobertura automatizada desequilibrada

Os testes atuais verificam autenticação, propostas, etapas, remoção e listagem. Porém, todos permanecem em `backend/test/security.test.mjs`, mesmo quando não tratam de segurança.

Ainda faltam:

- testes de frontend;
- regressão da navegação entre clientes;
- testes do ciclo de vida das views;
- testes do contrato dos JSONs;
- integração com MongoDB para operações transacionais;
- validação automatizada das fixtures.

Os testes podem ser separados por assunto sem mudar a infraestrutura atual baseada no test runner nativo do Node.

### 6.8 Operação e código legado

Foram encontrados alguns pontos que não exigem mudança arquitetural, mas prejudicam a confiabilidade:

- `server.ts` chama `connect()` sem aguardar antes de iniciar o servidor;
- o callback de `listen` registra conexão com o MongoDB sem garantir que ela terminou;
- `/api/test` e o modelo `Projeto` aparentam ser código de desenvolvimento legado;
- o schema de cliente não define índice único para `login`;
- a configuração CORS ainda reúne origens de desenvolvimento e produção;
- o build do frontend avisa sobre caminhos CSS antigos em `projects.html`;
- não há scripts de lint, testes de frontend ou CI no `package.json` raiz.

## 7. Plano incremental recomendado

### Prioridade 1 — estabilidade das views

1. Padronizar a criação de uma nova árvore DOM por montagem.
2. Padronizar desmontagem com `replaceChildren` e descarte de listeners globais.
3. Adicionar teste de regressão ao alternar entre clientes.

### Prioridade 2 — controle das views persistidas

1. Criar validador dos arquivos em `dev/database`.
2. Validar campos obrigatórios, nomes conhecidos, duplicidade e HTML básico.
3. Criar comando idempotente de upsert.
4. Adicionar versão ou checksum para detectar drift.
5. Garantir índice único adequado na coleção de views.

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

1. Aguardar a conexão com MongoDB antes de chamar `listen`.
2. Documentar a exigência de transações/replica set.
3. Remover ou proteger `/api/test`.
4. Remover o modelo legado `Projeto` se ele não tiver uso real.
5. Corrigir os caminhos CSS apontados pelo build.
6. Separar CORS por ambiente.

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

O momento atual pede refatoração incremental e localizada, principalmente no frontend administrativo, no ciclo de vida das views e na sincronização das views persistidas. Essas melhorias cabem integralmente na organização existente.

Se as telas maiores forem divididas conforme forem modificadas e o processo das views for automatizado, a arquitetura poderá sustentar a próxima fase do sistema sem reescrita geral.
