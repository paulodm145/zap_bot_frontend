# Tarefas atômicas — Integração frontend

Cada tarefa deve partir da `main`, terminar com os checks verdes e retornar por fast-forward antes da próxima. O contrato de referência é `docs/api/` e, quando disponível, `GET http://localhost:3000/api/v1/openapi.json`.

## Fundação

- [x] **INT-00 — Registrar baseline visual**  
  Branch: `main` · Commit: `chore: establish frontend visual baseline`
- [x] **INT-01 — Planejar integração**  
  Branch: `docs/integration-task-plan` · Commit: `docs: plan frontend backend integration`
- [x] **INT-02 — Criar cliente HTTP e sessão**  
  Branch: `feat/api-foundation` · Commit: `feat(api): add authenticated http client foundation`  
  Aceite: URL configurável, erro tipado, Bearer, cookie, refresh único e Query Provider.
- [x] **INT-03 — Adequar paginação da DataTable**  
  Branch: `feat/backend-pagination` · Commit: `feat(table): support backend skip take pagination`  
  Aceite: componente recebe `{ skip, take, total }` e emite novos `skip`/`take`.

## Jornadas públicas

- [x] **INT-04 — Integrar login tenant**  
  Branch: `feat/tenant-auth` · Commit: `feat(auth): integrate tenant login and session`  
  Aceite: hook próprio, estados de envio/erro, sessão em memória e redirecionamento.
- [ ] **INT-05 — Integrar solicitação de recuperação**  
  Branch: `feat/password-recovery` · Commit: `feat(auth): integrate password recovery request`  
  Aceite: hook próprio, resposta 202 não enumerável e tratamento de 429.
- [ ] **INT-06 — Criar redefinição de senha**  
  Branch: `feat/password-reset` · Commit: `feat(auth): add password reset flow`  
  Aceite: token da URL somente em memória, política de senha e tratamento de 204/422.

## Fluxos

- [ ] **INT-07 — Integrar lista e criação de fluxos**  
  Branch: `feat/flows-list` · Commit: `feat(flows): integrate paginated flow listing`  
  Aceite: hooks de listagem/criação, busca/estado, DataTable e navegação pelo `public_id`.
- [ ] **INT-08 — Integrar detalhe e salvamento de fluxo**  
  Branch: `feat/flow-editor-api` · Commit: `feat(flows): integrate editor load and save`  
  Aceite: hooks de detalhe/update, conversão grafo↔definição e bloqueio de salvamento concorrente.
- [ ] **INT-09 — Integrar publicação e simulação**  
  Branch: `feat/flow-publish-simulate` · Commit: `feat(flows): integrate publish and simulation`  
  Aceite: hooks separados, erros 409/422 mapeados e estado de simulação preservado.

## Fechamento

- [ ] **INT-10 — Reconciliar tipos com OpenAPI**  
  Branch: `chore/openapi-contract` · Commit: `chore(api): reconcile types with openapi contract`  
  Bloqueio atual: backend indisponível em `localhost:3000` em 02/08/2026.
- [ ] **INT-11 — Rodar revisão integrada**  
  Branch: `test/integration-hardening` · Commit: `test: cover frontend integration boundaries`  
  Aceite: lint, tipos, testes, build e auditoria sem regressões.
