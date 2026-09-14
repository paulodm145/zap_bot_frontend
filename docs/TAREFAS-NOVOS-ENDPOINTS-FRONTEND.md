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
- [x] **NE-07 — Resgata o construtor de regras do bloco de condição**
  Branch: `feat/construtor-regras-condicao` · Commit de merge:
  `merge: integra construtor de regras do bloco de condicao`
  Relatado pelo usuário: o bloco de condição não permitia montar regras de
  redirecionamento manualmente (o campo de mensagem era descartado no
  salvamento; sem seletor de operadores lógicos). Investigação encontrou uma
  implementação completa já pronta, de agosto/2026
  (`feat/condicao-construtor-regras`, 16 commits), nunca mesclada em `main`.
  Resgatada via merge (único conflito trivial em `vitest.config.mts`,
  resolvido); nenhum arquivo de `chat-view`/`whatsapp-accounts` recente foi
  afetado, pois a branch nunca os tocou.
  Aceite: bloco de condição agora mostra um construtor "SE variável
  [é igual a/é diferente de] valor ENTÃO vá para bloco", com reordenação por
  botões e destino "senão"; contrato do backend (`dados.regras`/`dados.
  padrao`) inalterado; lint, tipos, 76 testes e build aprovados.
- [x] **NE-08 — Preserva a posição dos blocos no canvas ao salvar/recarregar**
  Branch: `feat/construtor-regras-condicao` (mesma do NE-07)
  Relatado pelo usuário: ao salvar um fluxo e reabri-lo, os blocos apareciam
  reorganizados numa grade, misturando o layout que o usuário tinha montado.
  Causa raiz: o contrato do backend (`definicaoFluxoSchema`, `.strict()`)
  nunca teve campo de posição — `definitionToGraph` sempre recalculava um
  layout em grade a partir do índice do nó, descartando qualquer arranjo
  feito na tela.
  Exigiu mudança de contrato no backend (`backend_zap_bot`, branch
  `feat/posicao-no-fluxo`): campo opcional `posicao: { x, y }` em cada nó,
  documentado em `docs/schemas/fluxo-json.md`; motor de execução não lê o
  campo (puramente visual).
  Aceite: `graphToDefinition` serializa `node.position` em `posicao`;
  `definitionToGraph` usa `posicao` quando presente e só recorre à grade para
  fluxos antigos sem essa informação; teste dedicado cobre que a posição
  exata é preservada sem recálculo; teste de integração no backend confirma
  o round-trip via `POST`→`GET /fluxos/:id`; lint, tipos, testes e build
  aprovados nos dois repositórios.
