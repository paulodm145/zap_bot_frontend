# Tarefas atômicas — Superadmin frontend

O painel interno usa sessão e token exclusivos. Nenhum hook interno pode usar refresh, store ou permissões do tenant.

- [x] **SA-00 — Planejar módulo interno**  
  Branch: `docs/superadmin-task-plan` · Commit: `docs: plan superadmin frontend module`
- [x] **SA-01 — Integrar autenticação e TOTP**  
  Branch: `feat/superadmin-auth` · Commit: `feat(superadmin): add isolated login and totp flow`  
  Aceite: login, configuração/validação TOTP, sessão em memória, guard e tratamento de 401/429.
- [x] **SA-02 — Criar shell e visão geral**  
  Branch: `feat/superadmin-dashboard` · Commit: `feat(superadmin): add internal dashboard shell`  
  Aceite: navegação própria, saúde da sessão e indicadores sem depender do painel tenant.
- [x] **SA-03 — Integrar listagem de tenants**  
  Branch: `feat/superadmin-tenants-list` · Commit: `feat(superadmin): add paginated tenant management`  
  Aceite: hook, busca, status, plano, ordenação e DataTable `skip`/`take`.
- [x] **SA-04 — Integrar provisionamento manual**  
  Branch: `feat/superadmin-tenant-create` · Commit: `feat(superadmin): add idempotent tenant provisioning`  
  Aceite: UUID por tentativa lógica, formulário validado, senha inicial e resposta 202.
- [ ] **SA-05 — Integrar detalhe e ações sensíveis**  
  Branch: `feat/superadmin-tenant-detail` · Commit: `feat(superadmin): add tenant detail and sensitive actions`  
  Aceite: detalhe, usuários, assinaturas, confirmação com motivo, status e plano.
- [ ] **SA-06 — Validar módulo interno**  
  Branch: `test/superadmin-hardening` · Commit: `test(superadmin): cover internal session boundaries`  
  Aceite: token isolado, nenhum refresh tenant, lint, tipos, testes e build.

## Pendência de contrato

O OpenAPI ativo ainda não descreve o corpo das respostas de saúde interna, provisionamento, detalhe, alteração de status e alteração de plano. Os tipos dessas respostas permanecerão manuais até o backend publicar os schemas executáveis.
