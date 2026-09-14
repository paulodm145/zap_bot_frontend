# Construtor de regras do bloco de condição

Data: 2026-08-06
Área: `flows`

## Problema

O bloco de condição é hoje inutilizável por quem não conhece o código.

O painel de propriedades mostra um campo "Conteúdo / instrução" que é
**descartado** no salvamento: `graphToDefinition` monta o bloco de condição
apenas com `regras` e `padrao` e ignora `data.content`.

As regras reais são os rótulos das arestas, e não existe interface para
editá-los. Quando o usuário conecta as saídas no canvas, `graphToDefinition`
gera a expressão automaticamente como `opcao == "1"`, `opcao == "2"`, na ordem
das conexões, e trata a última saída como `padrao`.

Isso produz um erro silencioso: a variável gerada é literalmente `opcao`. Se o
bloco de captura salvar em `cliente.opcao` — o exemplo da própria documentação
do backend —, nenhuma regra casa e **toda** conversa cai no caminho padrão, sem
nenhum aviso na tela.

Verificado em 06/08/2026 contra o backend local: um fluxo montado com a variável
`cliente.opcao` e regras automáticas sempre cai no padrão; o mesmo fluxo com a
variável nomeada `opcao` funciona.

## Objetivo

Um usuário leigo monta a condição respondendo "se X for Y, vá para Z", sem
precisar entender arestas, expressões ou o formato aceito pelo backend.

## O contrato já existe

`GET /api/v1/fluxos/blocos` descreve o formulário que falta implementar:

- `dados.regras` — tipo `lista_condicoes`, obrigatório, `minimoItens: 1`,
  `maximoItens: 20`, `maximoCaracteres: 300`, alimentado por
  `fonteOpcoes.tipo = variaveis_fluxo`;
- `dados.padrao` — tipo `referencia_no`, obrigatório, alimentado por
  `fonteOpcoes.tipo = nos_fluxo`;
- `linguagemCondicao.operadores` — `==` e `!=`, formato
  `variavel operador "valor"`;
- serialização de cada regra:
  `{ "se": "{variavel} {operador} \"{valor}\"", "entao": "{noId}" }`.

O editor ignora todos esses campos e nem os tipa. O desenho correto está
contratado; falta implementá-lo.

## Decisões

1. **O painel comanda a criação dos ramos.** O usuário adiciona regras no painel
   de propriedades e escolhe o bloco de destino; a seta aparece sozinha no
   canvas.
2. **A lista de variáveis contém apenas as capturas que alcançam a condição** no
   grafo, conforme a fonte `variaveis_fluxo`. Sem nenhuma, o painel orienta a
   adicionar um bloco de captura antes.
3. **O destino oferece somente blocos já existentes** no canvas. Destino vazio
   mantém a regra incompleta e reprova na validação.
4. **As regras passam a viver em `node.data`**, e as arestas da condição são
   derivadas delas. O rótulo da aresta deixa de ser dado e vira apresentação.

## Modelo de dados

Em `src/features/flows/types.ts`:

```ts
export type FlowRuleOperator = '==' | '!=';

export type FlowRule = {
  /** Chave estável para render e reordenação; não é enviada ao backend. */
  id: string;
  variavel: string;
  operador: FlowRuleOperator;
  valor: string;
  /** Vazio enquanto a regra estiver incompleta. */
  destinoId: string;
};
```

`FlowNodeData` em `src/features/flows/flow-graph.ts` ganha dois campos
preenchidos apenas em blocos de condição:

```ts
regras?: FlowRule[];
padraoId?: string;
```

O campo `content` deixa de ser lido e escrito em blocos de condição.

## Módulo de lógica pura

Novo arquivo `src/features/flows/flow-rules.ts`, sem React:

| Função                                     | Responsabilidade                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `parseRule(se, entao)`                     | `opcao == "1"` → `FlowRule`; devolve `null` se não casar com o padrão    |
| `serializeRule(rule)`                      | `FlowRule` → `opcao == "1"`                                             |
| `describeRule(rule)`                       | rótulo humano do canvas: `Se opcao é igual a 1`                         |
| `rulesToEdges(node)`                       | deriva as arestas da condição a partir de `regras` e `padraoId`         |
| `variaveisDisponiveis(nodes, edges, id)`   | variáveis de captura que alcançam a condição, sem repetição             |

`variaveisDisponiveis` percorre o grafo a partir do nó inicial até a condição e
coleta `data.variable` dos blocos de captura no caminho. O backend declara
`restricoesGrafo.ciclosPermitidos: false`, mas a travessia mantém um conjunto de
visitados para não depender disso.

`flow-rules.ts` entra em `coverage.include` do `vitest.config.mts`.

## Mudanças em `flow-graph.ts`

- `graphToDefinition` serializa `node.data.regras` com `serializeRule` e usa
  `padraoId` como `dados.padrao`. Some a geração automática de
  `opcao == "N"` e a heurística de "última aresta vira o padrão".
- `definitionToGraph` usa `parseRule` para reconstruir `regras` e lê
  `dados.padrao` em `padraoId`.
- As arestas da condição deixam de ser construídas ali: passam a vir de
  `rulesToEdges`.

## Interface

Novo componente `src/components/fluxo/condition-rules-editor.tsx` com CSS Module
ao lado. Recebe regras, variáveis disponíveis, blocos do canvas e limites do
catálogo por props, e devolve callbacks. Não chama API, não lê sessão, não
conhece rotas. Também alivia `flow-editor.tsx`, hoje com cerca de 700 linhas.

Layout do painel quando `kind === 'condition'`:

```text
PROPRIEDADES DO BLOCO
Condição

Nome do bloco  [ Identificar intenção            ]

Regras                            [+ Adicionar regra]
┌──────────────────────────────────────────────────┐
│ 1ª                                    [↑] [↓] [🗑] │
│ SE     [opcao          ▾] [é igual a ▾] [ 1     ] │
│ ENTÃO vá para  [Direcionar setor: Financeiro   ▾] │
└──────────────────────────────────────────────────┘

Se nenhuma regra for verdadeira
vá para  [Mensagem: não entendi                  ▾]
```

- Os cartões são numerados porque a ordem define a precedência: a primeira regra
  verdadeira vence. Subir e descer são botões, não arraste.
- O seletor de operador exibe "é igual a" e "é diferente de"; os valores são os
  operadores do catálogo.
- O seletor de destino mostra tipo e nome do bloco.
- Sem variáveis disponíveis, o construtor mostra "Adicione um bloco Capturar
  resposta antes desta condição" e desabilita "Adicionar regra".
- Ao atingir `maximoItens` do catálogo, "Adicionar regra" é desabilitado com a
  justificativa visível.
- O campo "Conteúdo / instrução" e a prévia de mensagem não aparecem para
  condição.

Acessibilidade: todo campo com label associado, botões apenas iconográficos com
`aria-label`, alvos de toque em torno de 40 px, foco visível e estado nunca
comunicado só por cor. Os tokens vêm de `globals.css`.

`FlowBlockCatalogItem` passa a tipar `campos`, `conexoes` e o catálogo a expor
`linguagemCondicao` e `restricoesGrafo`, para que operadores e limites venham do
backend em vez de constantes no componente.

## Sincronização entre regras e arestas

O estado `edges` guarda apenas as conexões de blocos comuns. As arestas da
condição são derivadas por `useMemo` a partir dos nós e concatenadas antes de
entregar ao `ReactFlow`. Não existem duas cópias do mesmo dado.

- Arrastar do handle de saída da condição continua funcionando: cria uma regra
  com o destino preenchido, operador `==` e, se houver exatamente uma variável
  disponível, já com ela selecionada.
- As arestas derivadas recebem `deletable: false`. Remover um ramo é pela
  lixeira do cartão. Permitir a exclusão pelo canvas exigiria traduzir cada
  evento de aresta de volta para a lista de regras, complexidade que não se
  paga.
- Apagar um bloco de destino limpa o `destinoId` das regras que apontavam para
  ele e o `padraoId` quando for o caso. A regra fica incompleta e visível, em vez
  de apontar para um bloco inexistente.

## Validação

`validateGraph` passa a reportar, para blocos de condição:

| Situação                              | Mensagem                                                        |
| ------------------------------------- | --------------------------------------------------------------- |
| Nenhuma regra                         | "Adicione ao menos uma regra."                                   |
| Regra sem variável, valor ou destino  | "Complete a 2ª regra: falta escolher o destino."                 |
| Sem saída padrão                      | "Escolha para onde ir quando nenhuma regra for verdadeira."      |
| Variável não capturada antes          | "A variável `opcao` não é capturada antes desta condição."       |

Sai a checagem de formato do rótulo da aresta: com campos estruturados não é
mais possível digitar uma expressão inválida.

O campo *valor* bloqueia aspas simples e duplas, com mensagem inline, porque o
formato do backend é `variavel operador "valor"` e uma aspa dentro do valor
quebra a expressão. A regra serializada respeita o limite de 300 caracteres.

No 422 da publicação, o `campo` do erro (`dados.regras[0].se`) destaca a regra
específica pelo índice, além do bloco.

## Compatibilidade

Fluxos já salvos continuam abrindo: toda expressão aceita pelo backend casa com
o padrão de `parseRule`, inclusive as geradas pela versão anterior do editor.

Quando `parseRule` devolver `null`, a regra é carregada incompleta e o texto
original aparece na mensagem de validação, para que nada seja perdido em
silêncio.

## Testes

Vitest com `environment: 'node'`; não há Testing Library instalada, então a
lógica testável fica fora do React.

`src/features/flows/flow-rules.test.ts`:

- ida e volta `parseRule` → `serializeRule` preservando a expressão;
- `parseRule` devolvendo `null` para expressão fora do formato;
- `describeRule` para `==` e `!=`;
- `rulesToEdges` derivando uma aresta por regra mais a do padrão, e omitindo as
  regras com destino vazio;
- `variaveisDisponiveis` incluindo captura no caminho, excluindo captura de ramo
  que não alcança a condição, e sem repetir variável.

`src/features/flows/flow-graph.test.ts` ganha:

- `graphToDefinition` serializando regras estruturadas e `padraoId`;
- `definitionToGraph` reconstruindo regras a partir de `dados.regras`;
- `validateGraph` para cada linha da tabela de validação.

Verificação de tela é manual: montar a condição pelo painel, salvar, publicar e
simular os dois ramos.

## Documentação

`DESIGN_SYSTEM.md` recebe o padrão do construtor de regras: cartão numerado,
seletores de variável, operador e destino, e o rodapé de saída padrão.

## Fora de escopo

- Persistir a posição dos blocos no canvas. Hoje as posições são recalculadas em
  grade a cada recarga; é um incômodo real, mas independente deste trabalho.
- Formulários gerados a partir de `campos` para os demais tipos de bloco.
- Operadores além de `==` e `!=`, que o backend não aceita.
- Criar o bloco de destino a partir do seletor da regra.
