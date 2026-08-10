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

### ConfirmDialog

`ConfirmDialog` confirma ações destrutivas. Recebe `title`, `description`, `onCancel` e `onConfirm`, além de `pending` e `error` para refletir a requisição em andamento e a falha do backend sem fechar o diálogo. Usa `role="alertdialog"`, fecha com `Escape` ou clique no fundo e é renderizado em portal.

Não use `confirm()` nativo: ele ignora os tokens, não exibe o erro da requisição e não permite descrever a consequência da ação. Toda exclusão deve explicar o que acontece com os dados relacionados.

```tsx
<ConfirmDialog
  title={`Excluir ${setor.nome}?`}
  description="O setor deixa de receber novas conversas."
  pending={remove.isPending}
  error={erro}
  onCancel={() => setRemoving(undefined)}
  onConfirm={() => remove.mutate(setor.public_id)}
/>
```

### Construtor de regras (bloco de condição)

`ConditionRulesEditor` monta a configuração do bloco de condição como uma lista de cartões numerados por precedência (`1ª`, `2ª`, …), avaliados de cima para baixo — a primeira regra verdadeira decide o caminho. Cada cartão organiza quatro campos em coluna, sempre com label visível: variável, comparação, valor e o bloco de destino (“Se a variável / Comparação / Valor / Então vá para”). Um rodapé separado por linha (`border-top`) fixa a saída padrão, usada quando nenhuma regra é verdadeira.

Reordenar e remover são botões de 40 px com ícone apenas — cada um leva `aria-label` descritivo (“Mover a 2ª regra para cima”, “Remover a 1ª regra”), nunca dependem só do ícone para se explicar. Os campos de cada cartão (`select`/`input`) também têm altura mínima de 40 px, definida no próprio módulo do componente — não dependem de estilo de outro arquivo, porque o componente é montado isolado. No foco, a borda muda para `--green-600`. Como o painel hospedeiro (`.properties input` em `flow-editor.module.css`) suprime o contorno nativo do navegador, o próprio componente declara um anel em `:focus-visible`: cor nunca é o único sinal de foco. Os seletores de campo são qualificados por `.builder` para vencer, em especificidade, os seletores descendentes de `.properties` em `flow-editor.module.css` quando o componente for aninhado ali. Quando não há variável capturada por um bloco anterior no fluxo, o construtor mostra um estado vazio (`--line` tracejado, fundo `--canvas`) explicando que é preciso adicionar um bloco “Capturar resposta” antes da condição, e desabilita “Adicionar regra”. Atingir `maximoRegras` também desabilita a ação, com aviso em `--warning`. O campo *valor* remove aspas simples e duplas do que for digitado — o formato enviado ao backend é `variavel operador "valor"` — e nunca faz isso em silêncio: uma mensagem inline (“Aspas não são aceitas no valor.”, em `--danger`) aparece abaixo do campo enquanto durar a tentativa, associada a ele por `aria-describedby`.

```tsx
<ConditionRulesEditor
  regras={regras}
  padraoId={padraoId}
  variaveis={variaveisDisponiveis}
  blocos={blocos}
  operadores={['==', '!=']}
  maximoRegras={10}
  disabled={salvando}
  onRulesChange={setRegras}
  onPadraoChange={setPadraoId}
/>
```

## Padrões de interface

- Use uma ação primária por contexto e verbos objetivos: “Salvar”, “Enviar instruções”.
- Mantenha estados de foco visíveis e alvos de toque com aproximadamente 40 px.
- Use cards apenas para agrupar conteúdo relacionado; evite card dentro de card.
- Em telas autenticadas, use `AppShell`. O editor é uma experiência própria em tela cheia.
- Mensagens, números e gráficos atuais são conteúdo demonstrativo, sem conexão com backend.

## Acessibilidade e responsividade

O contraste mínimo esperado é WCAG AA. Controles iconográficos precisam de `aria-label`; campos mantêm labels associados. Respeite `prefers-reduced-motion`. O menu lateral vira drawer abaixo de 920 px; autenticação usa uma coluna abaixo de 850 px; o editor recolhe biblioteca e propriedades em telas menores.
