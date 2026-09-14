# Tarefas — novos endpoints administrativos

- [x] **NE-01 — Integrar impersonação de tenant**
  Branch: `feat/superadmin-tenant-impersonation` · Commit: `feat(superadmin): integrate tenant impersonation`
  Aceite: token apenas em memória, sem refresh, banner persistente e retorno seguro ao painel interno.
- [x] **NE-02 — Integrar exclusão definitiva de tenant**
  Branch: `feat/superadmin-tenant-deletion` · Commit: `feat(superadmin): integrate permanent tenant deletion`
  Aceite: modal dedicado, senha, nome exato, motivo, confirmação e tratamento de `204` sem corpo.
- [x] **NE-03 — Reconciliar contratos de fluxos**
  Branch: `fix/flows-contract-reconciliation` · Commit: `fix(flows): reconcile current backend contracts`
  Aceite: criação navega pelo `public_id`, publicação refaz o detalhe e tipos de nó indisponíveis não aparecem no editor.
- [x] **NE-04 — Validar integrações atualizadas**
  Branch: `test/new-endpoints-integration` · Commit: `test: cover new administrative endpoints`
  Aceite: lint, tipos, testes, cobertura e build aprovados.
- [x] **NE-05 — Automação de fluxo de entrada por conta WhatsApp**
  Branch: `feat/reatribuir-conversa-e-fluxo-entrada` · Commit: `feat(atendimento): reatribui conversas órfãs e restaura fluxo de entrada`
  Descoberto ao migrar Contas WhatsApp para Evolution API
  (`feat/contas-whatsapp-evolution-api`): o formulário de criação enviava
  `fluxoEntradaPublicId`, mas `POST /contas-whatsapp` no backend nunca aceitou
  esse campo (schema estrito) — a seleção de fluxo nunca funcionou de fato,
  mesmo antes desta migração. Removida do formulário. Estava bloqueada por
  exigir decisão de produto e um campo novo em `ContaWhatsapp` no backend;
  ambos resolvidos (backend PR #5, branch `feat/motor-fluxo-mensagem-real`).
  Restaurado o seletor de fluxo publicado (`fluxoPublicoId`) no formulário de
  criação de conta WhatsApp, com o nome do campo atualizado para o contrato
  atual.
  Aceite: `useCreateWhatsApp` envia `fluxoPublicoId` quando selecionado;
  `WhatsAppAccount` expõe `fluxo`; a tabela de contas mostra o fluxo
  associado; lint, tipos, testes e build aprovados.
- [x] **NE-06 — UI de reatribuição manual de conversa (setor)**
  Branch: `feat/reatribuir-conversa-e-fluxo-entrada` · Commit: `feat(atendimento): reatribui conversas órfãs e restaura fluxo de entrada`
  Descoberto ao diagnosticar pendências para os testes manuais: o backend já
  suportava `POST /conversas/{id}/reatribuir` (só `ADMIN_TENANT`/`GESTOR`),
  mas não havia hook nem botão no frontend — uma conversa com o bot sem setor
  definido não tinha como ser roteada a um atendimento humano pelo painel.
  Também corrigido bug pré-existente: a aba "Encerradas" enviava
  `visao=ENCERRADA`, valor fora do enum aceito pela API (`TODAS`/`FILA`/
  `MINHAS`), o que sempre retornava `422`.
  Aceite: nova aba "Sem atendimento" (`status=BOT`, só admin/gestor) lista
  conversas órfãs; botão "Reatribuir" abre modal com seletor de setor e
  motivo obrigatório; aba "Encerradas" corrigida para `visao=TODAS&status=
  ENCERRADA`; lint, tipos, testes e build aprovados. Pendência conhecida: o
  modal não oferece seletor de atendente específico (só setor de destino) —
  a API aceita `atendenteId` opcional, mas não há endpoint para listar
  atendentes por setor; ficou fora de escopo por falta de tempo antes da
  apresentação de quarta-feira. Também não foram adicionados testes
  automatizados para os hooks/telas alterados: o repositório ainda não tem
  infraestrutura de teste de componente/hook (Testing Library + ambiente
  jsdom não configurados), só testes de lógica pura — construir essa
  infraestrutura ficou fora de escopo desta etapa.
