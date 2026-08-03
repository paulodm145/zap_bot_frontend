# Tarefas — novos endpoints administrativos

- [x] **NE-01 — Integrar impersonação de tenant**
  Branch: `feat/superadmin-tenant-impersonation` · Commit: `feat(superadmin): integrate tenant impersonation`
  Aceite: token apenas em memória, sem refresh, banner persistente e retorno seguro ao painel interno.
- [ ] **NE-02 — Integrar exclusão definitiva de tenant**
  Branch: `feat/superadmin-tenant-deletion` · Commit: `feat(superadmin): integrate permanent tenant deletion`
  Aceite: modal dedicado, senha, nome exato, motivo, confirmação e tratamento de `204` sem corpo.
- [ ] **NE-03 — Reconciliar contratos de fluxos**
  Branch: `fix/flows-contract-reconciliation` · Commit: `fix(flows): reconcile current backend contracts`
  Aceite: criação navega pelo `public_id`, publicação refaz o detalhe e tipos de nó indisponíveis não aparecem no editor.
- [ ] **NE-04 — Validar integrações atualizadas**
  Branch: `test/new-endpoints-integration` · Commit: `test: cover new administrative endpoints`
  Aceite: lint, tipos, testes, cobertura e build aprovados.
