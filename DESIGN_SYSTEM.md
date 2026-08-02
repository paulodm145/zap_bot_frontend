# ZapBot Design System

## Direção visual

O produto usa uma linguagem acolhedora, confiável e operacional. O verde remete ao universo de conversas, mas a identidade evita copiar elementos proprietários do WhatsApp. Superfícies claras, cantos suaves e sombras discretas deixam dados e ações em primeiro plano.

## Tokens

- **Primário:** `--green-700` (`#0e8468`) para ações; `--green-950` (`#073b32`) para navegação.
- **Apoio:** `--green-50` e `--green-100` para fundos e estados positivos.
- **Neutros:** `--ink` para texto, `--muted` para apoio, `--line` para divisores e `--canvas` para o fundo.
- **Semânticos:** `--warning` e `--danger`; não comunicar estado apenas por cor.
- **Raios:** 10 px em controles, 16 px em cards e 24 px em superfícies de destaque.

## Componentes primários

`Button` possui variantes `primary`, `secondary`, `ghost` e `danger`, além dos tamanhos `sm`, `md` e `icon`. `Input` sempre exige label visível. `Badge` representa estados curtos, nunca ações. `Logo` possui versões completa e compacta. Todos ficam em `src/components/ui/` e não acessam dados externos.

### DataTable

`DataTable<T>` recebe colunas tipadas, dados da página atual, ações de topo e ações por linha. As cores `green`, `blue` e `neutral` modificam somente a identidade visual. Ordenação e paginação são controladas pelo componente pai, permitindo integração com endpoints REST sem acoplar a tabela ao cliente HTTP.

```tsx
<DataTable
  columns={columns}
  data={response.items}
  getRowId={(row) => row.id}
  toolbar={<Button>Novo contato</Button>}
  pagination={{ skip, take, total: response.total }}
  onPaginationChange={({ skip, take }) => carregar({ skip, take })}
/>
```

O backend deve retornar `{ dados, total, skip, take }`. Ao alterar `take`, a tabela emite `skip: 0`. Use `loading` durante a requisição e forneça `sort`/`onSortChange` quando o endpoint aceitar ordenação.

## Padrões de interface

- Use uma ação primária por contexto e verbos objetivos: “Salvar”, “Enviar instruções”.
- Mantenha estados de foco visíveis e alvos de toque com aproximadamente 40 px.
- Use cards apenas para agrupar conteúdo relacionado; evite card dentro de card.
- Em telas autenticadas, use `AppShell`. O editor é uma experiência própria em tela cheia.
- Mensagens, números e gráficos atuais são conteúdo demonstrativo, sem conexão com backend.

## Acessibilidade e responsividade

O contraste mínimo esperado é WCAG AA. Controles iconográficos precisam de `aria-label`; campos mantêm labels associados. Respeite `prefers-reduced-motion`. O menu lateral vira drawer abaixo de 920 px; autenticação usa uma coluna abaixo de 850 px; o editor recolhe biblioteca e propriedades em telas menores.
