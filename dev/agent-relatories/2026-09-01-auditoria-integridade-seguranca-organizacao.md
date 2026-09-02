# Auditoria de integridade, segurança e organização

Data: 2026-09-01  
Repositório: `MarcellaSol-Portfolio`  
Modo: somente leitura; nenhuma correção foi aplicada  
Destinatário principal: próximo agente que for implementar as correções

## Atualização posterior — lote de segurança de 2026-09-01

Após esta auditoria, o usuário autorizou e foi implementado um primeiro lote de correções. Consultar a seção 11 de `dev/agent-relatories/2026-09-01-pentest-nao-destrutivo.md` para implementação, retestes e limitações.

- AUD-003: mitigado com rate limiting independente para admin e client.
- AUD-004: corrigido com logout frontend/backend e limpeza local.
- AUD-005: parcialmente mitigado por CSP; HTML bruto e token opcional em `localStorage` ainda permanecem.
- AUD-011: corrigido para novas sessões por registro persistente e revogação individual; tokens antigos foram invalidados.
- AUD-014: parcialmente corrigido por headers defensivos; separação de CORS por ambiente continua pendente.
- AUD-015: corrigido no escopo retestado, sem stack, caminhos ou mensagens internas nas respostas.

## 1. Objetivo e escopo

Esta auditoria cobre o código atualmente versionado do frontend e backend, as fixtures de views em `dev/database`, configuração de build, autenticação, autorização, uploads, integração com Google Drive, persistência em MongoDB e organização geral do repositório.

Foram permitidas apenas verificações não destrutivas. A única escrita realizada foi este relatório.

Não foram realizados:

- acesso ao conteúdo do MongoDB de produção;
- leitura dos valores de `backend/.env` (somente os nomes das variáveis foram inventariados);
- chamadas ao Google Drive;
- testes de invasão, carga ou exaustão de memória;
- alterações de dependências ou execução de `npm audit fix`;
- validação visual em navegador real.

## 2. Resumo executivo

O projeto compila e possui boas bases de autorização por papel, isolamento das propostas por cliente e proteção criptográfica das senhas/tokens. Entretanto, ainda não deve ser considerado endurecido para produção sem tratar os riscos de prioridade alta.

Resultado geral:

- Integridade funcional: **moderada**.
- Segurança de autenticação: **moderada**, com boas primitivas mas sem proteção contra abuso e sem revogação.
- Segurança de uploads: **baixa para produção**, devido ao potencial de consumo extremo de memória.
- Isolamento de dados entre clientes: **bom no fluxo auditado de propostas**.
- Organização/manutenibilidade: **moderada-baixa**, com módulos grandes, views posicionais e ausência de testes/CI.
- Dependências: **nenhuma vulnerabilidade conhecida detectada pelo `npm audit` em 2026-09-01**.

Prioridade recomendada antes de ampliar as funções do cliente:

1. Remover utilitários/endpoint de teste da execução pública.
2. Limitar uploads por requisição e por usuário sem manter gigabytes em memória.
3. Adicionar limitação de tentativas nos logins e endpoints caros.
4. Implementar logout real e revisar persistência/revogação de tokens.
5. Tornar a resolução de views determinística por `viewName`.
6. Garantir unicidade/validação de contas e compensação Drive/MongoDB.
7. Adicionar testes automatizados dos limites de autorização.

## 3. Verificações executadas

### 3.1 Resultados positivos

- `npm run build`: aprovado para frontend e backend.
- `npm audit --json` no backend: 0 vulnerabilidades conhecidas (270 dependências auditadas).
- `npm audit --json` no frontend: 0 vulnerabilidades conhecidas (95 dependências auditadas).
- `npm ls --all`: não retornou falha. O backend local possui alguns pacotes opcionais/extraneous de binários, algo que um `npm ci` limpo deve normalizar.
- As cinco fixtures em `dev/database` são JSON válido e têm `_id`, `viewName`, `permission`, `type` e `view` preenchidos.
- `backend/.env`, `node_modules` e diretórios de build estão ignorados pelo Git.
- Não foi encontrado histórico versionado de `.env`, chaves `.pem` ou `.key` pelos caminhos pesquisados.
- O build TypeScript está com `noEmitOnError`, `noImplicitAny` e `strictNullChecks`.

### 3.2 Alertas produzidos pelo build

O build passa, mas o Vite informa que sete estilos referenciados em `frontend/src/projects.html` não existem nos caminhos declarados e permanecerão sem resolução:

- `styles/reset.css`
- `styles/main.css`
- `styles/home/homePage-main.css`
- `styles/home/homePage.css`
- `styles/projects/projects-main.css`
- `styles/footer.css`
- `styles/header.css`

Os arquivos reais ficam em `frontend/src/portfolio/styles`. Portanto, `projects.html` tende a solicitar caminhos inexistentes no artefato publicado.

## 4. Achados priorizados

### AUD-001 — Utilitários de teste executam na página pública

Severidade: **alta**  
Tipo: exposição de dados, integridade visual e código de desenvolvimento em produção

Evidências:

- `frontend/src/portfolio/app.ts:12-17` executa `checkHealth()` e `testApi()` quando o caminho é `/` (o fallback define a página como `home`).
- `frontend/src/utils/testRequisitions.ts:4-45` escreve painéis de diagnóstico no DOM e contém logs de desenvolvimento.
- `backend/src/routes/testRoutes.ts:18-28` expõe `GET /api/test` sem autenticação e retorna todos os documentos da coleção `projetos`.

Impacto:

- A home pública consulta e exibe diagnóstico interno em produção.
- O endpoint de teste cria uma rota pública de enumeração de dados. Hoje o schema é pequeno, mas uma ampliação futura da coleção será exposta automaticamente.
- `testRequisitions.ts` usa `innerHTML` com o JSON recebido. O schema atual reduz a explorabilidade, mas a construção não deve permanecer em produção.
- A lógica baseada no nome da página também é inconsistente: em `/index.html`, `page` vira `index` e nem o controlador da home é inicializado.

Correção futura:

- Remover a importação e as chamadas de teste do bundle de produção.
- Excluir `/api/test` ou condicioná-lo explicitamente a desenvolvimento e autenticação administrativa.
- Manter somente um health check mínimo, sem detalhes desnecessários.
- Definir as entradas de página por configuração explícita, não por inferência frágil do pathname.

### AUD-002 — Uploads em memória permitem exaustão extrema de recursos

Severidade: **alta**  
Tipo: disponibilidade/DoS

Evidências:

- `backend/src/middleware/briefing-upload.middleware.ts:17-27` usa `multer.memoryStorage()`, aceita até 50 arquivos de 100 MB cada.
- `backend/src/middleware/proposal-upload.middleware.ts:4-6` usa `memoryStorage()`, aceita até 20 arquivos de 100 MB cada.
- Não existe limite agregado da requisição, controle de concorrência por usuário ou rate limiting.

Impacto:

- Limite teórico de até 5 GB em buffers por requisição de briefing e 2 GB por requisição de proposta, antes de considerar cópias/transporte.
- Um cliente autenticado pode repetir submissões de briefing e derrubar o processo por memória.
- Um token comprometido amplia o risco.

Correção futura:

- Reduzir limites por arquivo e definir limite agregado realista.
- Preferir streaming ou armazenamento temporário controlado, evitando buffers integrais no heap.
- Limitar concorrência e frequência por conta/IP.
- Rejeitar uploads quando `Content-Length` exceder o orçamento, sem depender apenas dele.
- Monitorar memória e tamanho enviado ao Drive.

Critério de aceite sugerido:

- Testes automatizados devem demonstrar rejeição antes da alocação integral de uma carga acima do limite.

### AUD-003 — Login sem rate limiting ou bloqueio progressivo

Severidade: **alta**  
Tipo: autenticação/brute force

Evidências:

- `POST /api/admin/login` e `POST /api/client/login` são públicos.
- `backend/src/server.ts` e as rotas não aplicam rate limiter.
- Não há contador de falhas, atraso progressivo, bloqueio temporário ou auditoria de tentativas.

Pontos positivos relacionados:

- Mensagem de credencial inválida é genérica.
- Senhas novas usam `scrypt` com salt aleatório (`backend/src/services/password.service.ts`).

Correção futura:

- Adicionar limites separados por IP e por identificador de conta.
- Usar atraso progressivo e telemetria de falhas.
- Definir limites mais rigorosos para login administrativo.
- Não confiar em CORS como proteção de autenticação.

### AUD-004 — “Sair” não encerra a sessão

Severidade: **alta** para integridade funcional; **média** para segurança  
Tipo: sessão

Evidências:

- Os seletores capturam `.logout-desktop`, mas nenhum módulo registra uma ação de logout.
- `frontend/src/client/modules/client-system.modules.ts:145-148` faz o logout mobile apenas chamar `desktopLogout.click()`, que não possui handler.
- Não há remoção de `Admin-Section` ou `Client-Section` ligada aos botões “Sair”.

Impacto:

- Os botões aparentam funcionar, mas não fazem nada.
- Quando “Lembrar de mim” foi usado, o bearer token permanece no `localStorage` por até sete dias.

Correção futura:

- Criar um serviço único de sessão por papel.
- No logout, apagar o armazenamento correto, remover dados sensíveis em memória e voltar à tela de login.
- Se houver revogação server-side, invalidar a sessão também no backend.
- Testar desktop e mobile.

### AUD-005 — Tokens persistentes + HTML bruto do banco aumentam o impacto de XSS

Severidade: **alta como cadeia de risco**  
Tipo: XSS, sessão e fronteira de confiança

Evidências:

- `frontend/src/client/templates/getter.ts:8` e `frontend/src/admin/templates/getter.ts:24-28` convertem diretamente `view` do MongoDB em DOM, sem sanitização ou allowlist.
- Tokens são persistidos opcionalmente no `localStorage` em `frontend/src/client/utils/handleLoginInteractions.ts:122-126` e `frontend/src/admin/utils/handleLoginInteractions.ts:115-119`.
- Não existe Content Security Policy nas entradas HTML nem middleware de headers de segurança no backend.
- Links de anexos são atribuídos diretamente com `link.href = url` em `frontend/src/client/templates/client-approval-item.template.ts` e no equivalente administrativo, sem allowlist explícita de protocolo/domínio.

Contexto:

- As views hoje são mantidas manualmente, não por entrada pública, então não há uma exploração direta demonstrada.
- As URLs de anexos criadas pelo fluxo atual vêm do Google Drive. O risco aumenta com dados legados, alteração manual incorreta ou comprometimento do banco.

Correção futura:

- Tratar as views como código: validar/sanitizar antes de persistir e antes de renderizar.
- Bloquear `script`, atributos `on*`, `javascript:`, `srcdoc`, `object`, `embed` e outras superfícies não necessárias.
- Aplicar CSP compatível com a aplicação e reduzir dependências externas.
- Validar anexos como `https:` e, preferencialmente, restringir aos hosts esperados do Drive.
- Avaliar sessões em cookie `HttpOnly`, `Secure`, `SameSite`, ou manter token somente em memória quando possível.

### AUD-006 — Admin associa views pela ordem não garantida do MongoDB

Severidade: **alta**  
Tipo: integridade/arquitetura

Evidências:

- `backend/src/repositories/view.repository.ts:4-6` consulta views sem `sort`.
- `frontend/src/admin/templates/getter.ts:35-39` associa `base`, `home`, `client` e `newClient` por índices 0–3.
- Os seletores administrativos também dependem de posições fixas de itens de navegação.
- O cliente já usa `viewName` e é mais robusto.

Impacto:

- A ordem natural de documentos do MongoDB não é contrato de negócio.
- Uma recriação/importação de registros pode renderizar a tela errada, ligar eventos aos elementos errados ou causar exceções.

Correção futura:

- Mapear todas as views administrativas exclusivamente por `viewName` normalizado.
- Validar views obrigatórias antes de remover a tela de login.
- Eliminar fallbacks posicionais depois de migrar todos os registros.
- Criar índice único em `(permission, viewName)`.

### AUD-007 — Login não possui unicidade garantida nem política de entrada

Severidade: **alta para integridade de contas**  
Tipo: banco de dados/validação

Evidências:

- `backend/src/models/client.ts:15` e `backend/src/models/admin.ts:5` não definem índice único para `login`.
- A criação verifica `existsByLogin` e depois insere (`backend/src/application/create-client.service.ts:24-39`), permitindo corrida entre operações concorrentes.
- Não há normalização consistente (`trim`, lowercase/case policy) nem limites de tamanho para login, nome, senha, título e descrição.
- Não há política mínima de senha na criação do cliente.

Impacto:

- Contas duplicadas podem tornar autenticação não determinística.
- Variações de caixa/espaços podem criar identidades visualmente iguais.
- Campos sem limites podem gerar abuso de armazenamento/interface.

Correção futura:

- Definir índice único para login e tratar erro `E11000`.
- Normalizar o login em um único ponto antes de consultar/criar.
- Definir limites e política de senha adequados ao contexto.
- Migrar/deduplicar dados existentes antes de criar o índice.

### AUD-008 — Operações Drive + MongoDB não são atomicamente compensadas

Severidade: **alta para integridade operacional**  
Tipo: consistência distribuída

Evidências:

- Criação de cliente cria pasta no Drive antes de persistir o cliente (`create-client.service.ts:29-39`).
- Criação/edição de proposta envia anexos antes de persistir/atualizar a proposta (`client-proposal.service.ts:27-40` e `52-62`).
- Submissão do briefing envia arquivos, salva briefing e só depois marca o cliente como preenchido (`submit-briefing.service.ts:37-53`).
- A remoção de proposta possui uma compensação parcial positiva: restaura a pasta caso a exclusão no Mongo falhe.

Impacto:

- Falhas intermediárias deixam pastas/arquivos órfãos ou estados divergentes.
- Um briefing pode estar salvo enquanto `hasFilledBriefing` permanece falso.

Correção futura:

- Modelar cada fluxo como saga com compensações idempotentes.
- Usar transação MongoDB para alterações internas relacionadas.
- Persistir estado de operação (`pending`, `completed`, `failed`) quando houver efeito externo.
- Criar tarefa de reconciliação Drive ↔ MongoDB e logs com correlation ID.

### AUD-009 — Briefing pode ser reenviado/regravado indefinidamente

Severidade: **alta**, caso a intenção seja preenchimento único  
Tipo: regra de negócio/disponibilidade

Evidências:

- O frontend usa `hasFilledBriefing` apenas para escolher a rota inicial.
- `POST /api/client/briefing` não impede reenvio quando `hasFilledBriefing` já é verdadeiro.
- O repositório faz upsert do documento, mas os arquivos enviados anteriormente ao Drive não são reconciliados/removidos.

Impacto:

- Um cliente autenticado pode gerar uploads repetidos e sobrescrever respostas.
- O banco mantém uma versão, enquanto o Drive pode acumular várias.

Decisão necessária:

- Se o briefing for imutável após envio: bloquear no backend com `409`.
- Se puder ser editado: criar versionamento/revisão explícita e política para anexos antigos.

### AUD-010 — Página `projects.html` é publicada com caminhos CSS inválidos

Severidade: **média-alta funcional**  
Tipo: build/deploy

Evidências:

- `frontend/src/projects.html:9-15` aponta para `styles/...`.
- Os estilos reais estão em `frontend/src/portfolio/styles/...`.
- O Vite emite sete warnings e mantém os links sem resolução.
- `frontend/src/portfolio/app.ts` também não inicializa comportamento para a página `projects`.

Correção futura:

- Corrigir os caminhos ou importar CSS pelo entry TypeScript.
- Adicionar smoke test do artefato `frontend/dist/projects.html` verificando status 200 de todos os assets.
- Fazer warnings de assets ausentes falharem no CI.

### AUD-011 — Sessões assinadas não possuem revogação e o admin não é revalidado

Severidade: **média-alta**  
Tipo: sessão/autorização

Evidências:

- Tokens HMAC duram sete dias (`backend/src/services/session-token.service.ts:16-25`).
- A validação confirma assinatura, papel e expiração, mas não consulta estado da conta.
- Rotas administrativas confiam apenas no principal assinado. Remover/alterar o admin no banco não invalida tokens já emitidos.
- Não há `sessionVersion`, `jti`, denylist ou rotação explícita de segredo.

Pontos positivos:

- A assinatura usa HMAC-SHA256.
- A comparação é timing-safe.
- Há validação do papel em cada grupo de rotas.

Correção futura:

- Adotar sessão persistida/revogável ou `sessionVersion` na conta.
- Revalidar conta administrativa em operações sensíveis.
- Planejar rotação de segredo e expiração menor para admin.

### AUD-012 — Migração de senhas legadas aceita texto puro até o próximo login

Severidade: **média-alta condicional**  
Tipo: credenciais

Evidências:

- `PasswordService.verify()` compara texto puro quando o valor não começa com `scrypt$`.
- `AuthenticateService` atualiza para hash apenas após login bem-sucedido.

Ponto positivo:

- A migração oportunista reduz gradualmente a exposição e a comparação é timing-safe para comprimentos iguais.

Risco:

- Se ainda houver registros legados, senhas permanecem recuperáveis no banco até que cada usuário faça login.

Correção futura:

- Inventariar de forma segura quantos registros não estão com hash.
- Forçar redefinição ou executar migração controlada; não é possível gerar hash sem conhecer a senha, então contas não migradas devem receber senha temporária/redefinição.
- Depois da migração, remover o fallback de texto puro.

### AUD-013 — Validação de arquivos é insuficiente

Severidade: **média**  
Tipo: upload/conteúdo não confiável

Evidências:

- O briefing aceita se MIME **ou** extensão corresponder (`briefing-upload.middleware.ts:20-24`), permitindo spoof simples.
- Propostas não aplicam nenhum `fileFilter`.
- Não há inspeção de magic bytes, antivírus ou normalização de nomes antes de enviar ao Drive.

Contexto:

- Propostas só podem ser enviadas por admin autenticado.
- Os arquivos ficam no Drive, não são servidos diretamente pelo Express.

Correção futura:

- Validar tipo real por assinatura e usar allowlist por contexto.
- Definir política de arquivos executáveis/compactados.
- Considerar varredura antimalware e quarentena antes de compartilhar.

### AUD-014 — Endurecimento HTTP e CORS incompletos

Severidade: **média**  
Tipo: configuração de produção

Evidências:

- Não há Helmet/CSP no backend.
- A allowlist CORS inclui portas de desenvolvimento e redes privadas em qualquer ambiente (`backend/src/server.ts:34-53`).
- `credentials: true` está ativo, embora a autenticação atual use bearer token em header.
- Entradas de IP sem esquema (`177.153...`) não correspondem a uma Origin válida e geram falsa sensação de configuração.
- O servidor começa a escutar antes de aguardar a conexão com MongoDB e registra “Conectado” no callback do `listen`.

Correção futura:

- Separar allowlists por `NODE_ENV` e validar configuração no boot.
- Adicionar headers de segurança e política CSP.
- Aguardar `connect()` antes de `listen()`.
- Implementar graceful shutdown e health/readiness separados.

### AUD-015 — Erros internos são devolvidos nos endpoints de login

Severidade: **média-baixa**  
Tipo: vazamento de informação

Evidências:

- `admin.controller.ts:29` e `client.controller.ts:37-40` incluem a mensagem original em respostas 500.
- `/api/test` também devolve `error.message` sem autenticação.

Correção futura:

- Responder mensagem pública genérica e registrar detalhes apenas no servidor com correlation ID.

### AUD-016 — Views do banco não possuem pipeline de sincronização/validação

Severidade: **média**  
Tipo: configuração/integridade

Evidências:

- `dev/database/*.json` é uma referência manual; não existe comando de upsert, validação de schema/HTML ou verificação de drift com o MongoDB.
- Algumas views são HTML comprimido em uma única string, o que dificulta revisão.
- Há markup tolerado pelo navegador, mas malformado em fixtures antigas, por exemplo atributos sem espaço em `client-management-view.json`.

Correção futura:

- Criar schema versionado e comando idempotente de import/upsert por `_id` ou `(permission, viewName)`.
- Validar JSON, campos obrigatórios, unicidade e HTML antes de importar.
- Preferir templates legíveis como fonte e gerar a string JSON mecanicamente.
- Incluir checksum/versão para detectar drift.

### AUD-017 — Modelo de propostas/status está semanticamente inconsistente e incompleto para aprovação

Severidade: **média**  
Tipo: domínio

Evidências:

- Status: `sent`, `beated`, `resent`, `Cancelled`; há mistura de caixa e `beated` não expressa claramente “alterações solicitadas”.
- O modelo possui `userComment`, mas ainda não há endpoint do cliente para aprovar, rejeitar ou comentar.
- A tela do cliente hoje é somente leitura, coerente com a etapa atual, mas ainda não constitui um fluxo de aprovação completo.

Correção futura:

- Definir máquina de estados antes de implementar ações do cliente.
- Sugestão de estados normalizados: `pending`, `changes_requested`, `approved`, `resent`, `cancelled`.
- Definir transições autorizadas por papel, timestamps e histórico/auditoria.
- Migrar dados existentes explicitamente.

### AUD-018 — Progresso do projeto está codificado na view

Severidade: **média funcional**  
Tipo: domínio/configuração

Evidências:

- `client-stages-approvals-view.json` fixa oito etapas, etapa atual 1 e progresso 0%.
- Não existe modelo/repositório/API para progresso por cliente.

Correção futura:

- Definir modelo de etapas separado da view.
- A view deve conter apenas containers; nomes, estado e progresso devem vir de uma API por cliente.
- Decidir se etapas são globais, por tipo de projeto ou personalizadas por cliente.

### AUD-019 — Ausência de testes automatizados, CI e documentação operacional

Severidade: **média-alta para evolução segura**  
Tipo: qualidade

Evidências:

- Não há suíte de testes unitários, integração ou end-to-end.
- Não foram encontrados workflows de CI, README operacional, SECURITY ou documentação de migração.
- O build é a única barreira automatizada atual.

Testes prioritários:

1. Cliente A nunca acessa propostas/briefing do cliente B.
2. Token client não acessa rotas admin e vice-versa.
3. Tokens expirados/adulterados são rejeitados.
4. Login sofre rate limit.
5. Uploads acima do limite são rejeitados sem pressão excessiva de memória.
6. Falhas no Drive não criam estado parcial silencioso.
7. Views são resolvidas por `viewName` independentemente da ordem.
8. Logout remove sessão persistida.
9. Smoke test das quatro entradas Vite e de todos os assets.
10. Transições futuras de proposta respeitam a máquina de estados.

### AUD-020 — Dívida de organização e manutenção

Severidade: **baixa-média**  
Tipo: organização

Itens observados:

- `frontend/src/client/controllers/briefing.controller.ts` tem aproximadamente 741 linhas.
- `frontend/src/admin/modules/admin-system.modules.ts` tem aproximadamente 372 linhas.
- `backend/src/services/briefing-report.ts` tem aproximadamente 385 linhas.
- `frontend/src/admin/selectors/home.selector.ts.ts` possui extensão duplicada.
- `frontend/src/*/selectors/collection.ts` parece legado/sem uso útil; o arquivo client importa tipo do admin.
- `backend/src/utils/connection.ts` aparenta ser código browser duplicado e sem consumidor no backend.
- Há logs e alerts de desenvolvimento espalhados.
- `dev` contém cerca de 48 MB e um ZIP rastreado de aproximadamente 19 MB; avaliar Git LFS ou armazenamento fora do repositório.
- O deploy usa `git pull && npm install` em produção, menos reprodutível que artefato imutável + `npm ci`.
- Não há formatter/linter configurado.

Correção futura:

- Separar controladores por caso de uso.
- Remover código morto após confirmar consumidores.
- Padronizar nomes, encoding, formatter e lint.
- Criar build/deploy reproduzível a partir de commit fixo.

### AUD-021 — Acessibilidade e semântica das telas de login

Severidade: **baixa**  
Tipo: UX/acessibilidade

Evidências:

- `admin.html` e `cliente.html` usam `lang="en"` em conteúdo português.
- Login e senha usam `<textarea>` em vez de `<input>`, inclusive para senha.
- Faltam atributos de autocomplete apropriados (`username`, `current-password`).

Correção futura:

- Usar `lang="pt-BR"`.
- Trocar por inputs semânticos, `type="password"`, labels ligadas por `for/id` e autocomplete correto.
- Revalidar navegação por teclado e leitores de tela.

### AUD-022 — Dependência externa de Font Awesome sem SRI

Severidade: **baixa-média**  
Tipo: supply chain/frontend

Evidências:

- As quatro entradas HTML carregam Font Awesome 4.7 por CDN.
- Não há `integrity`, `crossorigin` ou CSP.

Correção futura:

- Preferir asset local/versionado ou adicionar SRI/crossorigin e CSP.
- Links públicos com `target="_blank"` em `index.html`/`projects.html` devem declarar `rel="noopener noreferrer"` explicitamente.

## 5. Controles que devem ser preservados

Ao corrigir os achados, não remover ou enfraquecer:

- validação de papel em `requireAuthentication`;
- extração do ID do cliente a partir do token em `/api/client/proposals`;
- filtro `{ _id, userId }` nas mutações de propostas;
- `timingSafeEqual` em senha/token;
- `scrypt` com salt aleatório;
- validação de ObjectId antes de operações sensíveis;
- projeções reduzidas usadas nas listagens administrativas;
- escape de HTML no gerador de relatório;
- limites de imagem e limpeza do diretório temporário do relatório;
- `rel="noopener noreferrer"` nos links criados dinamicamente;
- compensação já existente na remoção de propostas do Drive.

## 6. Plano recomendado para futura implementação

### Fase 0 — Contenção imediata

- Remover chamadas públicas a `checkHealth/testApi`.
- Remover/proteger `/api/test`.
- Implementar logout real.
- Corrigir paths de CSS de `projects.html`.

### Fase 1 — Proteção de borda

- Rate limiting de login e endpoints caros.
- Limites agregados/streaming de uploads.
- Headers de segurança e CORS por ambiente.
- Respostas de erro genéricas.

### Fase 2 — Integridade de identidade e dados

- Normalizar e criar índices únicos de login.
- Resolver views por `viewName` e indexá-las de forma única.
- Definir política de reenvio/versionamento do briefing.
- Adicionar compensações/reconciliação Drive ↔ MongoDB.

### Fase 3 — Sessões e XSS

- Adicionar revogação/versionamento de sessão.
- Migrar senhas legadas restantes.
- Sanitizar/validar views e URLs.
- Adotar CSP e revisar armazenamento de bearer tokens.

### Fase 4 — Domínio de etapas e aprovações

- Definir máquina de estados das propostas.
- Implementar ações de cliente com autorização e histórico.
- Criar modelo/API real de etapas por cliente.
- Renderizar progresso a partir de dados, não da fixture.

### Fase 5 — Qualidade e operação

- Testes unitários, integração e E2E.
- CI com build, audit, lint, testes e validação de fixtures.
- Documentação de deploy/migração e seed idempotente de views.
- Refatoração gradual de módulos grandes e remoção de código morto.

## 7. Decisões de produto pendentes

Antes de implementar algumas correções, confirmar:

1. O briefing pode ser alterado após o primeiro envio?
2. O cliente pode aprovar, solicitar alterações e cancelar, ou apenas aprovar/rebater?
3. É necessário manter histórico imutável de cada versão da proposta?
4. As oito etapas são globais ou variam por cliente/tipo de projeto?
5. Tokens devem sobreviver ao fechamento do navegador?
6. Qual o tamanho e tipos reais permitidos para anexos?
7. As views continuarão no MongoDB ou podem migrar para templates versionados no código?

## 8. Notas para o próximo agente

- Este relatório é diagnóstico, não autorização para aplicar mudanças.
- Antes de cada correção, verificar o estado atual do Git; o código pode ter evoluído após 2026-09-01.
- Implementar em lotes pequenos, começando pela Fase 0.
- Preservar compatibilidade de dados apenas quando houver migração explícita e testada.
- Para mudanças nas views do MongoDB, atualizar/criar sempre o arquivo correspondente em `dev/database`, conforme convenção solicitada pelo usuário.
- Não acessar ou imprimir valores de `.env` em logs/relatórios.
- Depois de cada fase, executar build completo, testes de autorização e smoke test dos artefatos Vite.

## 9. Conclusão

O sistema tem fundamentos promissores: senhas novas devidamente derivadas, tokens assinados, papéis separados e o endpoint cliente de propostas corretamente vinculado ao sujeito autenticado. Os maiores riscos atuais não vêm de uma falha única de autorização horizontal, mas da combinação de código de teste público, uploads muito grandes em memória, ausência de limitação de abuso, sessão sem logout/revogação, HTML dinâmico confiado integralmente e operações distribuídas sem reconciliação.

A recomendação é estabilizar segurança e integridade antes de implementar as ações de aprovação do cliente. A sequência da seção 6 reduz primeiro a superfície pública e o risco de indisponibilidade, depois consolida o modelo de domínio.
