# Documento de Arquitetura — Frontend

**Autor:** Paulo Roberto
**Versão:** 1.0
**Data:** Julho/2026
**Referência:** PRD v1.0, Documento de Arquitetura do Backend v1.0, CONTEXTO-frontend.md

---

## 1. Visão geral

Repositório separado do backend, hospedado na Vercel, consumindo a API REST + WebSocket do backend (VPS) via subdomínio dedicado (`api.dominio.com`). Três blocos principais de UI: **editor de fluxo** (canvas de nós), **painel de atendimento** (fila + chat em tempo real) e **dashboard administrativo** (setores, atendentes, integrações, uso).

### 1.1 Diagrama de camadas

```
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js (App Router) — Vercel                 │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Rotas / Páginas                                             │  │
│  │  /login  /fluxos  /fluxos/[id]  /atendimento  /admin/*        │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                               ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Componentes de tela (containers)                            │  │
│  │  — orquestram hooks, não têm lógica de negócio direta         │  │
│  └───────┬──────────────────────────────────┬───────────────────┘  │
│          ▼                                  ▼                      │
│  ┌───────────────────────┐        ┌───────────────────────────┐   │
│  │  Hooks customizados     │        │  Componentes de UI puros  │   │
│  │  (regra de tela,        │        │  (design system, sem      │   │
│  │  useEditorDeFluxo,      │        │  chamada de API)          │   │
│  │  useFilaDeAtendimento)  │        └───────────────────────────┘   │
│  └───────┬─────────────────┘                                       │
│          ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Camada de dados                                              │  │
│  │  - React Query (server state, cache, refetch)                 │  │
│  │  - Zustand (UI state local: seleção de nó, painel aberto)     │  │
│  │  - Client de API tipado (gerado do OpenAPI do backend)        │  │
│  │  - Socket.io-client (eventos em tempo real)                   │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼────────────────────────────────────┘
                                ▼
                  ┌──────────────────────────┐
                  │  Backend API (VPS)         │
                  │  REST + WebSocket           │
                  └──────────────────────────┘
```

## 2. Stack tecnológica consolidada

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js (App Router) | SSR/SSG onde fizer sentido, deploy nativo na Vercel |
| Linguagem | TypeScript estrito | Consistência com o backend, `any` proibido |
| Editor de fluxo | React Flow | Padrão de mercado para canvas node-based |
| Estado de servidor | React Query (TanStack Query) | Cache, refetch, sincronização com API sem boilerplate manual |
| Estado local/UI | Zustand | Leve, sem boilerplate de Redux, suficiente para o escopo |
| Cliente de API | Gerado a partir do OpenAPI do backend (`openapi-typescript` ou `orval`) | Elimina drift entre front e contrato do backend |
| Tempo real | `socket.io-client` | Compatível com o servidor WebSocket do backend |
| Validação de formulário | Zod + `react-hook-form` | Mesma biblioteca de validação do backend, consistência |
| Estilização | Tailwind CSS | Produtividade, consistente com design tokens |
| Componentes base | shadcn/ui (Radix + Tailwind) | Acessibilidade nativa, componentes copiados pro repo (sem lock-in de estilo) |
| Ícones | Lucide (`lucide-react`) | SVG tree-shakeable, leve, padrão de facto junto com shadcn/ui |
| Testes de componente | Vitest + Testing Library | Padrão leve, rápido |
| Testes e2e (opcional, pós-MVP) | Playwright | Cobre fluxo crítico (login → publicar fluxo → receber mensagem) |

## 3. Estrutura de pastas sugerida

```
src/
  app/                        # rotas Next.js (App Router)
    login/
    fluxos/
      [id]/
    atendimento/
    admin/
      setores/
      atendentes/
      integracoes/
  components/
    ui/                       # componentes de design system puros (Button, Input, Modal...)
    fluxo/                    # componentes específicos do editor (nós customizados, sidebar de propriedades)
    atendimento/              # componentes específicos do painel (lista de fila, chat)
  hooks/
    use-editor-de-fluxo.ts
    use-fila-de-atendimento.ts
    use-auth.ts
  services/
    api-client/               # client gerado a partir do OpenAPI (não editar manualmente)
    websocket-client.ts
  stores/                     # Zustand stores (estado de UI local)
    editor-fluxo.store.ts
    atendimento.store.ts
  schemas/                    # Zod schemas de formulário
  types/
  utils/
```

## 4. Gerenciamento de estado — divisão clara

Regra: **tudo que vem do servidor** (fluxos, conversas, contatos, setores) vive no **React Query**; **tudo que é só estado de interface** (nó selecionado no canvas, painel lateral aberto, filtro ativo na tela) vive no **Zustand**. Nunca duplicar dado de servidor dentro de um store Zustand — evita dessincronia entre cache e estado local.

```typescript
// Server state — React Query
const { data: fluxo, isLoading } = useQuery({
  queryKey: ['fluxo', fluxoId],
  queryFn: () => apiClient.fluxos.buscarPorId(fluxoId),
});

// UI state — Zustand
const noSelecionadoId = useEditorFluxoStore((s) => s.noSelecionadoId);
const selecionarNo = useEditorFluxoStore((s) => s.selecionarNo);
```

## 5. Cliente de API tipado

- Gerado a partir do OpenAPI exposto pelo backend (`/api/v1/docs.json`), nunca escrito manualmente — reduz risco de drift do contrato (mesma decisão da seção 16 do documento de arquitetura do backend).
- Interceptor central de requisição:
  - Injeta `Authorization: Bearer` automaticamente.
  - Em resposta `401`, tenta renovar via refresh token e refaz a requisição original; se falhar, redireciona para `/login`.
  - Erros seguem o formato padrão `{ erro: { codigo, mensagem } }` (seção 14 do doc de backend) — tratados de forma centralizada e propagados ao React Query como erro tipado.

## 6. Autenticação no frontend

- Login (`POST /auth/login`) retorna access token + refresh token.
- **Access token**: mantido em memória (estado da aplicação, não em `localStorage`), reduzindo superfície de ataque XSS.
- **Refresh token**: armazenado em cookie `httpOnly` + `Secure` + `SameSite=None` (necessário por front e backend estarem em domínios diferentes — Vercel e VPS), setado pelo próprio backend na resposta de login. O frontend nunca lê/manipula esse cookie diretamente, só depende dele existir para o endpoint de refresh funcionar.
- Ao carregar a aplicação, se não houver access token em memória, tenta um refresh silencioso antes de redirecionar para login.
- Rotas protegidas via middleware do Next.js, verificando presença de sessão válida antes de renderizar página autenticada.

> Nota: essa divisão (access em memória, refresh em cookie httpOnly) é uma escolha de segurança do frontend em cima do contrato Bearer já definido no backend — não exige mudança no backend além de configurar o cookie na resposta de login, se optarem por essa abordagem. Se preferir simplificar para MVP (ambos em memória, sem cookie), também funciona — só perde a renovação silenciosa entre reloads de página.

## 7. Arquitetura do editor de fluxo (React Flow)

- Cada tipo de nó do backend (seção 15 do doc de arquitetura) tem um **componente de nó customizado** no React Flow: `NoMensagem`, `NoCapturaResposta`, `NoCondicao`, `NoIA`, `NoIntegracaoHttp`, `NoDirecionarSetor`.
- Estado do canvas (posição dos nós, conexões) é convertido para o formato `definicao` (seção 15 do backend) apenas no momento de salvar — não fica acoplado ao formato de armazenamento durante a edição.
- **Salvamento**: autosave com debounce (ex: 2s após última alteração) chamando `PUT /fluxos/:id`, mantendo status `rascunho`.
- **Publicação**: botão explícito chama `POST /fluxos/:id/publicar`; erros de validação retornados pelo backend (nó órfão, credencial inexistente, etc. — seção 15) são exibidos posicionados no nó problemático do canvas, não como alerta genérico.
- **Simulação**: painel lateral que chama `POST /fluxos/:id/simular`, simula a conversa dentro da própria tela sem depender de mensagem real do WhatsApp.
- Desfazer/refazer (undo/redo) implementado no estado local do editor (Zustand ou o próprio state manager do React Flow), sem chamar a API a cada passo — só persiste no autosave.

## 8. Arquitetura do painel de atendimento

- Conexão WebSocket estabelecida uma vez no layout da seção `/atendimento`, autenticada com o mesmo token da sessão.
- Eventos recebidos (seção 7 do CONTEXTO-frontend) **invalidam ou atualizam diretamente o cache do React Query** em vez de manter um estado paralelo:

```typescript
socket.on('conversa:nova_na_fila', (payload) => {
  queryClient.invalidateQueries({ queryKey: ['conversas', 'fila', payload.setorId] });
});

socket.on('conversa:mensagem_recebida', (payload) => {
  queryClient.setQueryData(['conversa', payload.conversaId, 'mensagens'], (antigo) => [
    ...(antigo ?? []),
    payload.mensagem,
  ]);
});
```

- Isso evita duas fontes de verdade (WebSocket vs REST) — o WebSocket só dispara atualização, o React Query continua sendo a única fonte de dado renderizado.
- Lista de fila com **paginação/virtualização** (ex: `react-virtual`) se o volume de conversas simultâneas crescer, evitando re-render pesado a cada evento.

## 9. Dashboard administrativo

- Telas de CRUD simples (setores, atendentes, integrações) — seguem o padrão de listagem paginada do backend (`skip`/`take`/`busca`, seção 13.5 do doc de backend), com componente de tabela reaproveitável (`TabelaPaginada<T>`) usado nas três telas.
- Tela de uso/consumo (`usage_logs`) exibida como gráfico simples (ex: consumo de IA por mês) — sem necessidade de biblioteca pesada de BI no MVP.

## 9.1 Fluxo de cadastro e contratação (público, sem autenticação)

Rotas públicas (`/cadastro/*`), fora do grupo de rotas protegidas por sessão:

| Tela | Rota | Descrição |
|---|---|---|
| Seleção de plano | `/cadastro` | Cards com os planos (`GET /publico/planos`), destacando limites e preço; botão avança pro formulário com o `plano_id` selecionado |
| Dados da empresa/admin | `/cadastro/dados` | Formulário (nome da empresa, nome do admin, e-mail, senha) usando os componentes de formulário da seção 10.3, validado com Zod antes de enviar |
| Redirecionamento para pagamento | — | Ao confirmar (`POST /publico/cadastro`), a resposta traz a URL do checkout hospedado do Pagar.me; o frontend redireciona o navegador diretamente para essa URL (não é uma tela própria) |
| Retorno pós-checkout | `/cadastro/confirmacao` | Página de retorno configurada no Pagar.me após o pagamento — exibe mensagem de "pagamento em processamento" (o provisionamento real depende do webhook, que pode levar alguns segundos) e orienta a checar o e-mail |

**Tratamento de estado transitório**: como o provisionamento do banco físico do tenant só ocorre após o webhook confirmar o pagamento (seção 17 do doc de backend), a tela de confirmação não deve prometer acesso imediato — texto sugerido: "Pagamento recebido! Estamos preparando seu ambiente, você receberá um e-mail em instantes com o acesso." Opcionalmente, fazer *polling* leve (ex: a cada 5s, por até 1 minuto) num endpoint público de status (`GET /publico/cadastro/:tenantId/status`) para redirecionar automaticamente ao login assim que o provisionamento concluir, evitando depender só do e-mail.

## 10. Estilização e design system

- Tailwind CSS com tokens de cor/tipografia centralizados (`tailwind.config.ts`), evitando valores mágicos espalhados pelos componentes.
- Componentes de UI puros (`components/ui/`) sem acesso a hooks de dado — recebem tudo via props, reaproveitáveis entre editor, painel e admin.
- Direção visual (paleta, tipografia, espaçamento) a ser definida como um passo específico de design antes da implementação das telas, evitando aparência genérica de template.

### 10.1 Biblioteca de componentes base

Recomendação: **shadcn/ui** — não é uma dependência instalada como pacote fechado, e sim um conjunto de componentes (baseados em Radix UI + Tailwind) que são copiados para dentro do próprio repositório e ficam totalmente editáveis. Vantagens para este projeto:
- Acessibilidade (foco, teclado, ARIA) já resolvida pelo Radix por baixo, sem esforço extra.
- Zero lock-in de estilo — como o código do componente fica no seu repo, dá pra customizar livremente sem lutar contra a biblioteca.
- Combina naturalmente com Tailwind, já definido como padrão de estilização.

### 10.2 Ícones — Lucide em vez de Font Awesome

Recomendação: **Lucide** (`lucide-react`) em vez de Font Awesome.

| | Lucide | Font Awesome |
|---|---|---|
| Formato | Componentes SVG individuais, tree-shakeable (só entra no bundle o ícone realmente usado) | Fonte de ícones (webfont) ou pacote SVG separado — versão gratuita é mais limitada em variedade |
| Peso no bundle | Mínimo, cada ícone importado isoladamente | Maior, especialmente na versão webfont clássica |
| Estilo visual | Um único estilo (line/stroke), consistente e moderno, sem precisar escolher entre variantes pagas | Múltiplos estilos, mas os mais completos ficam atrás de licença paga (Pro) |
| Integração com shadcn/ui | Padrão de facto usado pelos componentes shadcn/ui | Não é o padrão, exige adaptação |

```typescript
import { MessageSquare, GitBranch, Sparkles, Webhook, Users } from 'lucide-react';

<MessageSquare className="w-4 h-4 text-slate-500" />
```

Mapeamento sugerido de ícone por tipo de nó do editor de fluxo: `MessageSquare` (mensagem), `TextCursorInput` (captura de resposta), `GitBranch` (condição), `Sparkles` (IA), `Webhook` (integração HTTP), `Users` (direcionar setor).

### 10.3 Componentes de formulário

Conjunto mínimo em `components/ui/`, todos como componentes controlados, integrados a `react-hook-form` via `Controller` quando necessário, e recebendo mensagem de erro no formato padrão do projeto:

| Componente | Uso |
|---|---|
| `Input` | Texto simples, e-mail, número — variante `type` |
| `InputSenha` | Campo de senha com botão de mostrar/ocultar (ícone `Eye`/`EyeOff`) |
| `InputCredencial` | Campo mascarado para valores sensíveis (API Key/token de integração) — nunca exibe o valor salvo, só permite substituir |
| `Textarea` | Textos longos (ex: prompt de sistema do nó de IA) |
| `Select` | Escolha única (ex: tipo de autenticação da integração, setor de destino) |
| `MultiSelect` | Escolha múltipla (ex: setores de um atendente) |
| `Checkbox` | Booleanos simples |
| `RadioGroup` | Escolha única com poucas opções visíveis lado a lado |
| `Switch` | Toggle on/off (ex: ativar/desativar um fluxo) |
| `CampoBusca` | Input de busca com debounce, usado nas telas de listagem paginada (`skip`/`take`/`busca`) |
| `SeletorDeArquivo` | Upload de mídia (imagem/PDF/áudio) para nós de mensagem |
| `RotuloDoCampo` (`FormLabel`) | Label padronizado, com indicador de campo obrigatório |
| `MensagemDeErroDoCampo` | Texto de erro abaixo do campo, populado pelo `react-hook-form` a partir da validação Zod |

Padrão de integração com validação (Zod + react-hook-form):

```typescript
const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  urlWebhook: z.string().url('URL inválida'),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

<Input label="Nome" {...register('nome')} erro={errors.nome?.message} />
```

Todo componente de formulário segue essa mesma assinatura de prop `erro?: string`, garantindo aparência e comportamento consistentes em toda a aplicação (editor de fluxo, painel de atendimento, admin, painel interno).

### 10.4 Componentes de UI adicionais (além de formulário)

| Componente | Uso |
|---|---|
| `Modal` / `Dialog` | Confirmações (ex: publicar fluxo, suspender tenant no painel interno) |
| `Tooltip` | Dicas contextuais nos nós do editor de fluxo |
| `Badge` | Status visual (conversa `aguardando_atendente`, tenant `suspenso`, etc.) |
| `Toast` | Notificação temporária (ex: "Fluxo publicado com sucesso") |
| `Skeleton` | Estado de carregamento de listas (seção 11) |
| `TabelaPaginada<T>` | Componente genérico reaproveitado nas telas de listagem (fluxos, contatos, tenants no painel interno) |

## 11. Tratamento de erro e estados de carregamento

- Padrão único de exibição de erro de API (baseado no formato `{ erro: { codigo, mensagem } }`), com um componente `MensagemDeErro` reaproveitado em toda a aplicação.
- Estados de carregamento tratados via `isLoading`/`isFetching` do React Query, com componentes de *skeleton* para telas de listagem (fluxos, conversas, contatos) em vez de spinner genérico.
- Erros de conexão WebSocket (desconexão) exibem indicador discreto de "reconectando..." no painel de atendimento, com tentativa automática de reconexão.

## 12. Testes

- Componentes de UI pura: testes de renderização/interação com Vitest + Testing Library.
- Hooks customizados com lógica relevante (`useEditorDeFluxo`, `useFilaDeAtendimento`): testes unitários isolando a lógica de transformação de dados.
- Fluxo crítico end-to-end (login → criar fluxo → publicar → ver conversa chegar na fila) como candidato a teste Playwright, priorizado após o MVP estabilizar.

## 13. Build e deploy

- Deploy automático via integração Vercel-GitHub a cada push na branch principal.
- Variáveis de ambiente (URL da API, URL do WebSocket) configuradas por ambiente na Vercel (preview vs produção), nunca hardcoded.
- Cliente de API regenerado a partir do OpenAPI do backend como parte do pipeline (script `npm run gerar-client-api`), rodado manualmente ou via CI quando o contrato do backend mudar — evita builds com contrato desatualizado silenciosamente.

## 14. Performance

- Code splitting por rota, nativo do Next.js App Router.
- Editor de fluxo carregado sob demanda (`dynamic import`) já que React Flow é uma dependência pesada, não necessária nas telas de login/admin.
- Virtualização de listas longas (fila de atendimento, histórico de mensagens) para evitar degradação com volume alto de itens.

---

**Próximo passo sugerido:** definir a direção visual (paleta, tipografia, tom do design) antes de iniciar a implementação das primeiras telas, e then partir para o schema Prisma do backend em paralelo.
