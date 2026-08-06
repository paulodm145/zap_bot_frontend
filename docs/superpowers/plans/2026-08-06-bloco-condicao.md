# Construtor de regras do bloco de condição — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um usuário leigo monte as regras do bloco de condição respondendo "se X for Y, vá para Z" no painel de propriedades, sem entender arestas nem expressões.

**Architecture:** As regras passam a viver em `node.data.regras` (lista de `{ variavel, operador, valor, destinoId }`) e em `node.data.padraoId`. As arestas da condição no canvas deixam de ser dado e viram derivação dessas regras. A serialização para o contrato do backend (`opcao == "1"`) fica isolada em `src/features/flows/flow-rules.ts`, testável sem React.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 6 strict, `@xyflow/react`, TanStack Query 5, CSS Modules, Vitest 4 com `environment: 'node'`.

**Spec:** `docs/superpowers/specs/2026-08-06-bloco-condicao-design.md`

## Global Constraints

- TypeScript `strict`. Proibido `any`; use `unknown` com narrowing.
- Sem `interface` para modelo de dados: use `type`.
- Arquivos em kebab-case, componentes em PascalCase, hooks com prefixo `use`.
- Nomes de domínio que espelham o backend em pt-BR (`regras`, `padrao`, `variavel`, `valor`); o restante do código em inglês.
- Estilos em CSS Modules ao lado do componente. Proibido estilo inline para regra visual e proibido Tailwind.
- Cores, raios e sombras somente pelos tokens de `src/app/globals.css` (`--green-*`, `--ink`, `--muted`, `--line`, `--surface`, `--canvas`, `--warning`, `--danger`, `--radius-*`, `--shadow-*`).
- Acessibilidade: label associado em todo campo, `aria-label` em botão apenas iconográfico, foco visível, alvo de toque em torno de 40 px, estado nunca comunicado só por cor.
- Formatação: `npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write <arquivos.ts,tsx>` e, para CSS, `npx prettier@3.9.6 --print-width 120 --write <arquivos.css>`. Formate apenas os arquivos da sua alteração.
- Antes de cada commit: `npm run lint`, `npm run typecheck` e `npm test`.
- Operadores aceitos pelo backend: apenas `==` e `!=`, no formato `variavel operador "valor"`. O valor não pode conter aspas simples nem duplas.
- Limite do catálogo: no máximo 20 regras por condição; a expressão serializada de cada regra tem no máximo 300 caracteres.
- Branch de trabalho: `feat/condicao-construtor-regras` (já criado, com o spec commitado).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/features/flows/types.ts` (modificar) | `FlowRule`, `FlowRuleOperator` e `FlowNodeData` |
| `src/features/flows/flow-rules.ts` (criar) | parse, serialização, rótulo humano, derivação de arestas e variáveis disponíveis |
| `src/features/flows/flow-rules.test.ts` (criar) | testes do módulo acima |
| `src/features/flows/flow-graph.ts` (modificar) | conversão do contrato do backend usando as regras estruturadas |
| `src/features/flows/flow-graph.test.ts` (modificar) | testes de conversão e validação atualizados |
| `src/hooks/flows/use-flow-block-catalog.ts` (modificar) | tipar `campos`, `conexoes`, `linguagemCondicao` e `restricoesGrafo` |
| `src/components/fluxo/condition-rules-editor.tsx` (criar) | construtor de regras no painel |
| `src/components/fluxo/condition-rules-editor.module.css` (criar) | estilos do construtor |
| `src/components/fluxo/flow-editor.tsx` (modificar) | integração: painel, arestas derivadas, arraste, exclusão, erro 422 |
| `vitest.config.mts` (modificar) | incluir `flow-rules.ts` na cobertura |
| `DESIGN_SYSTEM.md` (modificar) | documentar o padrão do construtor de regras |

---

### Task 1: Tipos e serialização de regras

**Files:**
- Modify: `src/features/flows/types.ts`
- Create: `src/features/flows/flow-rules.ts`
- Test: `src/features/flows/flow-rules.test.ts`
- Modify: `vitest.config.mts:15-23`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `FlowRuleOperator = '==' | '!='`; `FlowRule = { id: string; variavel: string; operador: FlowRuleOperator; valor: string; destinoId: string }`; `FlowNodeData` (movido para `types.ts`, agora com `regras?: FlowRule[]` e `padraoId?: string`); `parseRule(se: string, entao: string, id: string): FlowRule | null`; `serializeRule(rule: FlowRule): string`; `describeRule(rule: FlowRule): string`; `nextRuleId(regras: FlowRule[]): string`; `ordinal(index: number): string`.

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/features/flows/flow-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { describeRule, nextRuleId, parseRule, serializeRule } from './flow-rules';
import type { FlowRule } from './types';

const rule = (patch: Partial<FlowRule> = {}): FlowRule => ({
  id: 'regra_1',
  variavel: 'opcao',
  operador: '==',
  valor: '1',
  destinoId: 'no_4',
  ...patch,
});

describe('flow rule parsing', () => {
  it('parses the backend expression into structured fields', () => {
    expect(parseRule('cliente.opcao == "1"', 'atendimento', 'regra_1')).toEqual({
      id: 'regra_1',
      variavel: 'cliente.opcao',
      operador: '==',
      valor: '1',
      destinoId: 'atendimento',
    });
  });

  it('parses the inequality operator', () => {
    expect(parseRule('opcao != "sair"', 'fim', 'regra_2')?.operador).toBe('!=');
  });

  it('tolerates the spacing accepted by the backend', () => {
    expect(parseRule('  opcao=="1"  ', 'no_4', 'regra_1')?.valor).toBe('1');
  });

  it('accepts an empty value', () => {
    expect(parseRule('opcao == ""', 'no_4', 'regra_1')?.valor).toBe('');
  });

  it('returns null for an expression outside the supported format', () => {
    expect(parseRule('Suporte', 'no_4', 'regra_1')).toBeNull();
    expect(parseRule('opcao > "1"', 'no_4', 'regra_1')).toBeNull();
  });

  it('round-trips parse and serialize', () => {
    const parsed = parseRule('cliente.opcao != "2"', 'no_4', 'regra_1');
    expect(parsed && serializeRule(parsed)).toBe('cliente.opcao != "2"');
  });
});

describe('flow rule labels', () => {
  it('describes an equality rule in plain language', () => {
    expect(describeRule(rule())).toBe('Se opcao é igual a 1');
  });

  it('describes an inequality rule in plain language', () => {
    expect(describeRule(rule({ operador: '!=', valor: 'sair' }))).toBe('Se opcao é diferente de sair');
  });

  it('marks an incomplete rule instead of showing an empty comparison', () => {
    expect(describeRule(rule({ variavel: '' }))).toBe('Regra incompleta');
  });
});

describe('flow rule ids', () => {
  it('starts after the highest existing rule id', () => {
    expect(nextRuleId([rule({ id: 'regra_1' }), rule({ id: 'regra_7' })])).toBe('regra_8');
  });

  it('starts at one for an empty list', () => {
    expect(nextRuleId([])).toBe('regra_1');
  });
});

describe('rule ordinals', () => {
  it('uses the feminine ordinal shown in the panel', () => {
    expect(ordinal(0)).toBe('1ª');
    expect(ordinal(9)).toBe('10ª');
  });

  it('falls back to a numeric ordinal beyond the mapped range', () => {
    expect(ordinal(19)).toBe('20ª');
  });
});
```

Acrescente `ordinal` ao import do topo do arquivo:

```ts
import { describeRule, nextRuleId, ordinal, parseRule, serializeRule } from './flow-rules';
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Run: `npm test -- src/features/flows/flow-rules.test.ts`
Expected: FAIL com `Failed to resolve import "./flow-rules"`.

- [ ] **Step 3: Mova `FlowNodeData` e acrescente os tipos de regra**

Em `src/features/flows/types.ts`, acrescente ao final:

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

export type FlowNodeData = {
  label: string;
  detail: string;
  kind: string;
  icon: string;
  content: string;
  sectorId?: string;
  /** Nome da variável onde a captura guarda a resposta; exigido pelo backend. */
  variable?: string;
  /** Somente em blocos de condição. */
  regras?: FlowRule[];
  /** Somente em blocos de condição: destino quando nenhuma regra for verdadeira. */
  padraoId?: string;
  validationError?: string;
};
```

Em `src/features/flows/flow-graph.ts`, remova a declaração local de `FlowNodeData` (linhas 4-14) e substitua por um reexport, para não quebrar quem já importa dali:

```ts
import type { FlowNodeData } from './types';

export type { FlowNodeData } from './types';
```

- [ ] **Step 4: Implemente `flow-rules.ts`**

Crie `src/features/flows/flow-rules.ts`:

```ts
import type { FlowRule, FlowRuleOperator } from './types';

/** Espelha `EXPRESSAO_COMPARACAO` de `condicao-fluxo.helper.ts` no backend. */
const EXPRESSAO = /^\s*([A-Za-z_][A-Za-z0-9_.]{0,79})\s*(==|!=)\s*(['"])([^'"]*)\3\s*$/;

const ROTULO_OPERADOR: Record<FlowRuleOperator, string> = {
  '==': 'é igual a',
  '!=': 'é diferente de',
};

/**
 * Converte a expressão persistida pelo backend nos campos do formulário.
 * Devolve `null` quando o texto não é uma comparação suportada, para que a
 * interface trate a regra como incompleta em vez de perder o conteúdo.
 */
export function parseRule(se: string, entao: string, id: string): FlowRule | null {
  const match = EXPRESSAO.exec(se);
  if (!match) return null;
  return {
    id,
    variavel: match[1],
    operador: match[2] as FlowRuleOperator,
    valor: match[4],
    destinoId: entao,
  };
}

export function serializeRule(rule: FlowRule): string {
  return `${rule.variavel} ${rule.operador} "${rule.valor}"`;
}

export function describeRule(rule: FlowRule): string {
  if (!rule.variavel) return 'Regra incompleta';
  return `Se ${rule.variavel} ${ROTULO_OPERADOR[rule.operador]} ${rule.valor}`;
}

/** Deriva o próximo id do maior já presente, como `nextNodeId` faz com os nós. */
export function nextRuleId(regras: FlowRule[]): string {
  const highest = regras.reduce((max, rule) => {
    const match = /^regra_(\d+)$/.exec(rule.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `regra_${highest + 1}`;
}

const ORDINAIS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª'];

/** Usado na interface e nas mensagens de validação; mora aqui para não divergir. */
export function ordinal(index: number): string {
  return ORDINAIS[index] ?? `${index + 1}ª`;
}
```

- [ ] **Step 5: Rode o teste e confirme que passa**

Run: `npm test -- src/features/flows/flow-rules.test.ts`
Expected: PASS, 13 testes.

- [ ] **Step 6: Inclua o módulo na cobertura**

Em `vitest.config.mts`, na lista `coverage.include`, acrescente a linha logo após `'src/features/flows/flow-graph.ts',`:

```ts
        'src/features/flows/flow-rules.ts',
```

- [ ] **Step 7: Verifique o repositório inteiro e commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write \
  src/features/flows/flow-rules.ts src/features/flows/flow-rules.test.ts src/features/flows/types.ts src/features/flows/flow-graph.ts
npm run lint && npm run typecheck && npm test
git add src/features/flows/flow-rules.ts src/features/flows/flow-rules.test.ts src/features/flows/types.ts src/features/flows/flow-graph.ts vitest.config.mts
git commit -m "feat(flows): estrutura as regras de condicao em campos tipados"
```

---

### Task 2: Derivação de arestas e variáveis disponíveis

**Files:**
- Modify: `src/features/flows/flow-rules.ts`
- Test: `src/features/flows/flow-rules.test.ts`

**Interfaces:**
- Consumes: `FlowRule`, `FlowNodeData`, `describeRule` da Task 1.
- Produces: `rulesToEdges(node: Node<FlowNodeData>): Edge[]`; `variaveisDisponiveis(nodes: Node<FlowNodeData>[], edges: Edge[], nodeId: string): string[]`.

- [ ] **Step 1: Escreva o teste que falha**

Acrescente ao final de `src/features/flows/flow-rules.test.ts`:

```ts
import type { Edge, Node } from '@xyflow/react';
import { rulesToEdges, variaveisDisponiveis } from './flow-rules';
import type { FlowNodeData } from './types';

function node(id: string, data: Partial<FlowNodeData>): Node<FlowNodeData> {
  return {
    id,
    type: 'flowNode',
    position: { x: 0, y: 0 },
    data: { label: '', detail: id, kind: 'message', icon: 'message', content: '', ...data },
  };
}

describe('condition edges derived from rules', () => {
  it('creates one edge per rule plus the default branch', () => {
    const condicao = node('no_3', {
      kind: 'condition',
      regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'no_4' }],
      padraoId: 'no_5',
    });
    expect(rulesToEdges(condicao)).toEqual([
      expect.objectContaining({ source: 'no_3', target: 'no_4', label: 'Se opcao é igual a 1', deletable: false }),
      expect.objectContaining({ source: 'no_3', target: 'no_5', label: 'Senão', deletable: false }),
    ]);
  });

  it('skips rules without a destination', () => {
    const condicao = node('no_3', {
      kind: 'condition',
      regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: '' }],
      padraoId: 'no_5',
    });
    expect(rulesToEdges(condicao)).toHaveLength(1);
  });

  it('returns nothing for a node that is not a condition', () => {
    expect(rulesToEdges(node('no_1', { kind: 'message' }))).toEqual([]);
  });
});

describe('variables reaching a condition', () => {
  const grafo = () => ({
    nodes: [
      node('no_1', { kind: 'message' }),
      node('no_2', { kind: 'capture', variable: 'opcao' }),
      node('no_3', { kind: 'condition' }),
      node('no_9', { kind: 'capture', variable: 'fora_do_caminho' }),
    ],
    edges: [
      { id: 'e1', source: 'no_1', target: 'no_2' },
      { id: 'e2', source: 'no_2', target: 'no_3' },
    ] as Edge[],
  });

  it('lists captures that reach the condition', () => {
    const { nodes, edges } = grafo();
    expect(variaveisDisponiveis(nodes, edges, 'no_3')).toEqual(['opcao']);
  });

  it('ignores captures in branches that never reach the condition', () => {
    const { nodes, edges } = grafo();
    expect(variaveisDisponiveis(nodes, edges, 'no_3')).not.toContain('fora_do_caminho');
  });

  it('does not repeat a variable captured in two branches', () => {
    const nodes = [
      node('no_1', { kind: 'condition' }),
      node('no_2', { kind: 'capture', variable: 'opcao' }),
      node('no_3', { kind: 'capture', variable: 'opcao' }),
      node('no_4', { kind: 'condition' }),
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'no_1', target: 'no_2' },
      { id: 'e2', source: 'no_1', target: 'no_3' },
      { id: 'e3', source: 'no_2', target: 'no_4' },
      { id: 'e4', source: 'no_3', target: 'no_4' },
    ];
    expect(variaveisDisponiveis(nodes, edges, 'no_4')).toEqual(['opcao']);
  });

  it('terminates when the graph has a cycle', () => {
    const nodes = [node('no_1', { kind: 'capture', variable: 'opcao' }), node('no_2', { kind: 'condition' })];
    const edges: Edge[] = [
      { id: 'e1', source: 'no_1', target: 'no_2' },
      { id: 'e2', source: 'no_2', target: 'no_1' },
    ];
    expect(variaveisDisponiveis(nodes, edges, 'no_2')).toEqual(['opcao']);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Run: `npm test -- src/features/flows/flow-rules.test.ts`
Expected: FAIL com `rulesToEdges is not a function` (ou erro de import não resolvido).

- [ ] **Step 3: Implemente as duas funções**

No topo de `src/features/flows/flow-rules.ts`, acrescente o import de tipos:

```ts
import type { Edge, Node } from '@xyflow/react';
import type { FlowNodeData, FlowRule, FlowRuleOperator } from './types';
```

E acrescente ao final do arquivo:

```ts
/**
 * As arestas da condição são derivadas das regras, nunca guardadas em estado.
 * `deletable: false` porque remover um ramo é responsabilidade do painel: o
 * canvas não teria como devolver a mudança para a lista de regras.
 */
export function rulesToEdges(node: Node<FlowNodeData>): Edge[] {
  if (node.data.kind !== 'condition') return [];
  const edges: Edge[] = [];
  for (const rule of node.data.regras ?? []) {
    if (!rule.destinoId) continue;
    edges.push({
      id: `${node.id}-${rule.id}`,
      source: node.id,
      target: rule.destinoId,
      label: describeRule(rule),
      deletable: false,
    });
  }
  if (node.data.padraoId) {
    edges.push({
      id: `${node.id}-padrao`,
      source: node.id,
      target: node.data.padraoId,
      label: 'Senão',
      deletable: false,
    });
  }
  return edges;
}

/**
 * Variáveis de captura que alcançam a condição, percorrendo o grafo de trás
 * para frente. O backend declara `ciclosPermitidos: false`, mas o conjunto de
 * visitados garante o término mesmo com um ciclo montado na tela.
 */
export function variaveisDisponiveis(nodes: Node<FlowNodeData>[], edges: Edge[], nodeId: string): string[] {
  const pais = new Map<string, string[]>();
  for (const edge of edges) {
    pais.set(edge.target, [...(pais.get(edge.target) ?? []), edge.source]);
  }
  const ancestrais = new Set<string>();
  const fila = [nodeId];
  while (fila.length > 0) {
    const atual = fila.shift() as string;
    for (const pai of pais.get(atual) ?? []) {
      if (ancestrais.has(pai)) continue;
      ancestrais.add(pai);
      fila.push(pai);
    }
  }
  const nomes = nodes
    .filter((node) => ancestrais.has(node.id) && node.data.kind === 'capture')
    .map((node) => node.data.variable ?? '')
    .filter((nome) => nome !== '');
  return [...new Set(nomes)];
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

Run: `npm test -- src/features/flows/flow-rules.test.ts`
Expected: PASS, 21 testes.

- [ ] **Step 5: Verifique e commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write \
  src/features/flows/flow-rules.ts src/features/flows/flow-rules.test.ts
npm run lint && npm run typecheck && npm test
git add src/features/flows/flow-rules.ts src/features/flows/flow-rules.test.ts
git commit -m "feat(flows): deriva arestas e variaveis disponiveis das regras"
```

---

### Task 3: Conversão do contrato usando regras estruturadas

**Files:**
- Modify: `src/features/flows/flow-graph.ts:27-78` (`definitionToGraph`), `:128-166` (`graphToDefinition`)
- Test: `src/features/flows/flow-graph.test.ts`

**Interfaces:**
- Consumes: `parseRule`, `serializeRule` da Task 1.
- Produces: `definitionToGraph` devolve blocos de condição com `data.regras` e `data.padraoId`, e **não** devolve mais arestas de condição; `graphToDefinition` serializa a partir de `data.regras` e `data.padraoId`.

- [ ] **Step 1: Escreva o teste que falha**

Em `src/features/flows/flow-graph.test.ts`, substitua o teste `converts backend nodes and references into visual nodes and edges` (linhas 24-48) por:

```ts
  it('converts backend nodes and references into visual nodes and edges', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'inicio',
      nos: [
        { id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá' }, proximo: 'decidir' },
        {
          id: 'decidir',
          tipo: 'condicao',
          dados: { regras: [{ se: 'opcao == "1"', entao: 'fiscal' }], padrao: 'fim' },
        },
        { id: 'fiscal', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' } },
        { id: 'fim', tipo: 'mensagem', dados: { texto: 'Fim' } },
      ],
    });
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes[0].data.content).toBe('Olá');
    // As arestas da condição são derivadas por rulesToEdges, não devolvidas aqui.
    expect(graph.edges).toEqual([expect.objectContaining({ source: 'inicio', target: 'decidir' })]);
    expect(graph.nodes[1].data.regras).toEqual([
      { id: 'decidir-regra-1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'fiscal' },
    ]);
    expect(graph.nodes[1].data.padraoId).toBe('fim');
  });

  it('keeps an unsupported expression visible as an incomplete rule', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'decidir',
      nos: [{ id: 'decidir', tipo: 'condicao', dados: { regras: [{ se: 'Suporte', entao: 'a' }], padrao: 'b' } }],
    });
    expect(graph.nodes[0].data.regras).toEqual([
      { id: 'decidir-regra-1', variavel: '', operador: '==', valor: 'Suporte', destinoId: 'a' },
    ]);
  });
```

Substitua o teste `always emits a default branch for condition nodes` (linhas 121-136) por:

```ts
  it('serializes structured rules and the default branch', () => {
    const nodes: FlowGraph['nodes'] = [
      node('decidir', {
        kind: 'condition',
        icon: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: 'opcao', operador: '!=', valor: '2', destinoId: 'b' },
        ],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(graphToDefinition(nodes, []).nos[0]).toEqual({
      id: 'decidir',
      tipo: 'condicao',
      dados: {
        regras: [
          { se: 'opcao == "1"', entao: 'a' },
          { se: 'opcao != "2"', entao: 'b' },
        ],
        padrao: 'b',
      },
    });
  });

  it('omits incomplete rules when serializing', () => {
    const nodes: FlowGraph['nodes'] = [
      node('decidir', {
        kind: 'condition',
        icon: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: '', operador: '==', valor: '', destinoId: '' },
        ],
        padraoId: 'b',
      }),
    ];
    const dados = (graphToDefinition(nodes, []).nos[0] as { dados: { regras: unknown[] } }).dados;
    expect(dados.regras).toHaveLength(1);
  });

  it('round-trips a condition through the backend contract', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'decidir',
      nos: [
        { id: 'decidir', tipo: 'condicao', dados: { regras: [{ se: 'opcao == "1"', entao: 'a' }], padrao: 'b' } },
        { id: 'a', tipo: 'mensagem', dados: { texto: 'A' } },
        { id: 'b', tipo: 'mensagem', dados: { texto: 'B' } },
      ],
    };
    const graph = definitionToGraph(definition);
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual(definition);
  });
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Run: `npm test -- src/features/flows/flow-graph.test.ts`
Expected: FAIL — `graph.edges` ainda contém as arestas da condição e `data.regras` é `undefined`.

- [ ] **Step 3: Implemente a conversão**

Em `src/features/flows/flow-graph.ts`, acrescente ao import de `flow-rules`:

```ts
import { parseRule, serializeRule } from './flow-rules';
```

Dentro de `definitionToGraph`, no `map` que monta os nós, acrescente ao objeto `data` (junto dos spreads condicionais já existentes):

```ts
        ...(kind === 'condition'
          ? {
              regras: (Array.isArray(data.regras) ? data.regras : []).map((raw, ruleIndex) => {
                const item = raw as Record<string, unknown>;
                const se = String(item.se ?? '');
                const entao = String(item.entao ?? '');
                const ruleId = `${id}-regra-${ruleIndex + 1}`;
                // Expressão fora do formato não é descartada: vira regra
                // incompleta com o texto original no campo de valor.
                return (
                  parseRule(se, entao, ruleId) ?? {
                    id: ruleId,
                    variavel: '',
                    operador: '==' as const,
                    valor: se,
                    destinoId: entao,
                  }
                );
              }),
              padraoId: typeof data.padrao === 'string' ? data.padrao : '',
            }
          : {}),
```

Ainda em `definitionToGraph`, no bloco que monta `edges`, **remova** os dois trechos que criam arestas a partir de `data.regras` e `data.padrao` (as arestas `${source}-regra-${index}` e `${source}-padrao`). Restam apenas as arestas de `raw.proximo`.

Em `graphToDefinition`, substitua todo o ramo `if (node.data.kind === 'condition')` por:

```ts
      if (node.data.kind === 'condition') {
        const regras = (node.data.regras ?? []).filter((rule) => rule.variavel !== '' && rule.destinoId !== '');
        return {
          id: node.id,
          tipo: 'condicao',
          dados: {
            regras: regras.map((rule) => ({ se: serializeRule(rule), entao: rule.destinoId })),
            padrao: node.data.padraoId ?? '',
          },
        };
      }
```

- [ ] **Step 4: Rode os testes e confirme que passam**

Run: `npm test -- src/features/flows/flow-graph.test.ts`
Expected: PASS. Se o teste `accepts a condition with a rule and a default branch` (linhas 193-200) ou os de `condition rule expressions` (linhas 206-227) falharem, deixe-os falhando: eles serão reescritos na Task 4.

- [ ] **Step 5: Commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write \
  src/features/flows/flow-graph.ts src/features/flows/flow-graph.test.ts
git add src/features/flows/flow-graph.ts src/features/flows/flow-graph.test.ts
git commit -m "feat(flows): serializa a condicao a partir das regras estruturadas"
```

---

### Task 4: Validação da condição

**Files:**
- Modify: `src/features/flows/flow-graph.ts:92-126` (`validateGraph` e a constante `conditionPattern`)
- Test: `src/features/flows/flow-graph.test.ts:185-227`

**Interfaces:**
- Consumes: `variaveisDisponiveis` da Task 2.
- Produces: `validateGraph(nodes, edges)` com as mensagens da tabela abaixo. A assinatura não muda; `edges` deve receber as arestas já derivadas.

- [ ] **Step 1: Escreva o teste que falha**

Em `src/features/flows/flow-graph.test.ts`, substitua os testes `rejects a condition with a single outgoing branch` e `accepts a condition with a rule and a default branch` (linhas 185-200) e todo o bloco `describe('condition rule expressions', ...)` (linhas 203-227) por:

```ts
  it('rejects a condition without rules', () => {
    const nodes = [condition('decidir')];
    expect(validateGraph(nodes, [])).toEqual([{ nodeId: 'decidir', message: 'Adicione ao menos uma regra.' }]);
  });

  it('points at the rule that is missing a destination', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: 'opcao', operador: '==', valor: '2', destinoId: '' },
        ],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    const edges = [{ id: 'e1', source: 'captura', target: 'decidir' }];
    expect(validateGraph(nodes, edges)).toEqual([
      { nodeId: 'decidir', message: 'Complete a 2ª regra: falta escolher o destino.' },
    ]);
  });

  it('rejects a condition without a default branch', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: '',
      }),
      message('a', 'A'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([
      { nodeId: 'decidir', message: 'Escolha para onde ir quando nenhuma regra for verdadeira.' },
    ]);
  });

  it('rejects a rule whose variable is never captured before the condition', () => {
    const nodes = [
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'cliente.opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [])).toEqual([
      { nodeId: 'decidir', message: 'A variável cliente.opcao não é capturada antes desta condição.' },
    ]);
  });

  it('rejects a value containing quotes', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: 'a"b', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([
      { nodeId: 'decidir', message: 'O valor da 1ª regra não pode conter aspas.' },
    ]);
  });

  it('accepts a complete condition', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([]);
  });
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Run: `npm test -- src/features/flows/flow-graph.test.ts`
Expected: FAIL — a validação atual ainda cobra duas arestas de saída.

- [ ] **Step 3: Implemente a validação**

Em `src/features/flows/flow-graph.ts`, remova a constante `conditionPattern` (linha 98) e acrescente ao import de `flow-rules`:

```ts
import { ordinal, parseRule, serializeRule, variaveisDisponiveis } from './flow-rules';
```

Acrescente acima de `validateGraph`:

```ts
/** Espelha `maximoCaracteres` do campo `dados.regras` no catálogo do backend. */
const MAXIMO_CARACTERES_REGRA = 300;

function validateCondition(
  node: Node<FlowNodeData>,
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): string | undefined {
  const regras = node.data.regras ?? [];
  if (regras.length === 0) return 'Adicione ao menos uma regra.';
  const disponiveis = variaveisDisponiveis(nodes, edges, node.id);
  for (const [index, rule] of regras.entries()) {
    if (!rule.variavel) return `Complete a ${ordinal(index)} regra: falta escolher a variável.`;
    if (!rule.valor) return `Complete a ${ordinal(index)} regra: falta informar o valor.`;
    if (!rule.destinoId) return `Complete a ${ordinal(index)} regra: falta escolher o destino.`;
    if (/["']/.test(rule.valor)) return `O valor da ${ordinal(index)} regra não pode conter aspas.`;
    if (serializeRule(rule).length > MAXIMO_CARACTERES_REGRA)
      return `A ${ordinal(index)} regra é longa demais; reduza o valor.`;
    if (!disponiveis.includes(rule.variavel))
      return `A variável ${rule.variavel} não é capturada antes desta condição.`;
  }
  if (!node.data.padraoId) return 'Escolha para onde ir quando nenhuma regra for verdadeira.';
  return undefined;
}
```

Dentro de `validateGraph`, substitua os dois ramos `else if (node.data.kind === 'condition' ...)` por um único:

```ts
    } else if (node.data.kind === 'condition') {
      const message = validateCondition(node, nodes, edges);
      if (message) issues.push({ nodeId: node.id, message });
```

A variável local `outgoing` deixa de ser usada por esse ramo; mantenha-a apenas se outro ramo ainda a usar, caso contrário remova a declaração para o lint não acusar.

- [ ] **Step 4: Rode os testes e confirme que passam**

Run: `npm test`
Expected: PASS em toda a suíte.

- [ ] **Step 5: Verifique e commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write \
  src/features/flows/flow-graph.ts src/features/flows/flow-graph.test.ts
npm run lint && npm run typecheck && npm test
git add src/features/flows/flow-graph.ts src/features/flows/flow-graph.test.ts
git commit -m "feat(flows): valida a condicao por regra e aponta o campo faltante"
```

---

### Task 5: Catálogo tipado com operadores e limites

**Files:**
- Modify: `src/hooks/flows/use-flow-block-catalog.ts`

**Interfaces:**
- Consumes: `FlowRuleOperator` da Task 1.
- Produces: `FlowBlockField`, `FlowBlockConnections`, `FlowConditionLanguage`, `FlowGraphLimits`; `FlowBlockCatalog` passa a expor `linguagemCondicao` e `restricoesGrafo`; `FlowBlockCatalogItem` passa a expor `campos` e `conexoes`; `limiteDeRegras(catalog?: FlowBlockCatalog): number`.

- [ ] **Step 1: Amplie os tipos do catálogo**

Em `src/hooks/flows/use-flow-block-catalog.ts`, acrescente antes de `FlowBlockCatalogItem`:

```ts
import type { FlowRuleOperator } from '@/features/flows/types';

export type FlowBlockFieldType =
  | 'texto_curto'
  | 'texto_longo'
  | 'variavel'
  | 'lista_condicoes'
  | 'referencia_no'
  | 'seletor_setor';

export type FlowBlockField = {
  caminho: string;
  rotulo: string;
  descricao: string;
  tipo: FlowBlockFieldType;
  obrigatorio: boolean;
  validacao?: {
    minimoCaracteres?: number;
    maximoCaracteres?: number;
    minimoItens?: number;
    maximoItens?: number;
    padrao?: string;
  };
};

export type FlowBlockConnections = {
  aceitaEntrada: boolean;
  saidas: Array<{ chave: string; rotulo: string; tipo: 'unica' | 'dinamica'; obrigatoria: boolean; quantidadeMaxima?: number }>;
};

export type FlowConditionLanguage = { operadores: FlowRuleOperator[]; formato: string; exemplo: string };

export type FlowGraphLimits = { maximoBlocos: number; ciclosPermitidos: boolean; padraoIdentificador: string };
```

Acrescente a `FlowBlockCatalogItem` os dois campos novos:

```ts
  campos: FlowBlockField[];
  conexoes: FlowBlockConnections;
```

E substitua `FlowBlockCatalog` por:

```ts
export type FlowBlockCatalog = {
  schemaVersao: 1;
  linguagemCondicao: FlowConditionLanguage;
  restricoesGrafo: FlowGraphLimits;
  blocos: FlowBlockCatalogItem[];
};
```

- [ ] **Step 2: Exponha o limite de regras**

Ao final do mesmo arquivo:

```ts
/** Limite declarado em `dados.regras` do bloco de condição; 20 é o valor atual do backend. */
export function limiteDeRegras(catalog?: FlowBlockCatalog): number {
  const campo = catalog?.blocos.find((bloco) => bloco.tipo === 'condicao')?.campos.find((item) => item.caminho === 'dados.regras');
  return campo?.validacao?.maximoItens ?? 20;
}
```

- [ ] **Step 3: Rode a verificação de tipos**

Run: `npm run typecheck`
Expected: PASS. `catalogItemToTool` em `flow-editor.tsx` continua compilando porque só lê `configuracaoInicial`.

- [ ] **Step 4: Confirme o formato contra o backend real**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"usuario@zapbot.local","senha":"UsuarioLocal123!"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).accessToken))")
curl -s http://localhost:3000/api/v1/fluxos/blocos -H "Authorization: Bearer $TOKEN" | head -c 400
```
Expected: a resposta traz `schemaVersao`, `restricoesGrafo`, `linguagemCondicao` e `blocos`, batendo com os tipos declarados.

- [ ] **Step 5: Verifique e commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write src/hooks/flows/use-flow-block-catalog.ts
npm run lint && npm run typecheck && npm test
git add src/hooks/flows/use-flow-block-catalog.ts
git commit -m "feat(flows): tipa campos, conexoes e limites do catalogo de blocos"
```

---

### Task 6: Componente do construtor de regras

**Files:**
- Create: `src/components/fluxo/condition-rules-editor.tsx`
- Create: `src/components/fluxo/condition-rules-editor.module.css`
- Modify: `DESIGN_SYSTEM.md`

**Interfaces:**
- Consumes: `FlowRule`, `FlowRuleOperator` (Task 1), `nextRuleId` (Task 1).
- Produces: `ConditionRulesEditor` com as props `{ regras: FlowRule[]; padraoId: string; variaveis: string[]; blocos: Array<{ id: string; rotulo: string }>; operadores: FlowRuleOperator[]; maximoRegras: number; disabled: boolean; onRulesChange: (regras: FlowRule[]) => void; onPadraoChange: (padraoId: string) => void }`.

- [ ] **Step 1: Escreva o componente**

Crie `src/components/fluxo/condition-rules-editor.tsx`:

```tsx
'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nextRuleId, ordinal } from '@/features/flows/flow-rules';
import type { FlowRule, FlowRuleOperator } from '@/features/flows/types';
import styles from './condition-rules-editor.module.css';

const ROTULO_OPERADOR: Record<FlowRuleOperator, string> = {
  '==': 'é igual a',
  '!=': 'é diferente de',
};

export type ConditionRulesEditorProps = {
  regras: FlowRule[];
  padraoId: string;
  variaveis: string[];
  blocos: Array<{ id: string; rotulo: string }>;
  operadores: FlowRuleOperator[];
  maximoRegras: number;
  disabled: boolean;
  onRulesChange: (regras: FlowRule[]) => void;
  onPadraoChange: (padraoId: string) => void;
};

export function ConditionRulesEditor({
  regras,
  padraoId,
  variaveis,
  blocos,
  operadores,
  maximoRegras,
  disabled,
  onRulesChange,
  onPadraoChange,
}: ConditionRulesEditorProps) {
  const semVariaveis = variaveis.length === 0;
  const noLimite = regras.length >= maximoRegras;

  function adicionar() {
    const rule: FlowRule = {
      id: nextRuleId(regras),
      // Com uma única variável disponível, escolher por ele evita um passo óbvio.
      variavel: variaveis.length === 1 ? variaveis[0] : '',
      operador: '==',
      valor: '',
      destinoId: '',
    };
    onRulesChange([...regras, rule]);
  }

  function atualizar(index: number, patch: Partial<FlowRule>) {
    onRulesChange(regras.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
  }

  function remover(index: number) {
    onRulesChange(regras.filter((_, position) => position !== index));
  }

  function mover(index: number, destino: number) {
    if (destino < 0 || destino >= regras.length) return;
    const reordenadas = [...regras];
    const [rule] = reordenadas.splice(index, 1);
    reordenadas.splice(destino, 0, rule);
    onRulesChange(reordenadas);
  }

  return (
    <div className={styles.builder}>
      <div className={styles.header}>
        <span id="titulo-regras">Regras</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={adicionar}
          disabled={disabled || semVariaveis || noLimite}
          icon={<Plus size={15} />}
        >
          Adicionar regra
        </Button>
      </div>
      <p className={styles.hint}>As regras são avaliadas de cima para baixo. A primeira verdadeira decide o caminho.</p>
      {semVariaveis && (
        <div className={styles.empty}>
          <strong>Nenhuma variável disponível</strong>
          <p>Adicione um bloco “Capturar resposta” antes desta condição para poder comparar a resposta do cliente.</p>
        </div>
      )}
      {noLimite && <p className={styles.limit}>Limite de {maximoRegras} regras atingido.</p>}
      <ol className={styles.rules} aria-labelledby="titulo-regras">
        {regras.map((rule, index) => (
          <li key={rule.id} className={styles.rule}>
            <div className={styles.ruleHeader}>
              <span className={styles.position}>{ordinal(index)}</span>
              <div className={styles.ruleActions}>
                <button
                  type="button"
                  onClick={() => mover(index, index - 1)}
                  disabled={disabled || index === 0}
                  aria-label={`Mover a ${ordinal(index)} regra para cima`}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(index, index + 1)}
                  disabled={disabled || index === regras.length - 1}
                  aria-label={`Mover a ${ordinal(index)} regra para baixo`}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(index)}
                  disabled={disabled}
                  aria-label={`Remover a ${ordinal(index)} regra`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <label>
              <span>Se a variável</span>
              <select
                value={rule.variavel}
                onChange={(event) => atualizar(index, { variavel: event.target.value })}
                disabled={disabled}
              >
                <option value="">Selecione uma variável</option>
                {variaveis.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Comparação</span>
              <select
                value={rule.operador}
                onChange={(event) => atualizar(index, { operador: event.target.value as FlowRuleOperator })}
                disabled={disabled}
              >
                {operadores.map((operador) => (
                  <option key={operador} value={operador}>
                    {ROTULO_OPERADOR[operador]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Valor</span>
              <input
                value={rule.valor}
                // O formato do backend é variavel operador "valor": uma aspa
                // dentro do valor quebraria a expressão.
                onChange={(event) => atualizar(index, { valor: event.target.value.replace(/["']/g, '') })}
                disabled={disabled}
                placeholder="Ex.: 1"
              />
            </label>
            <label>
              <span>Então vá para</span>
              <select
                value={rule.destinoId}
                onChange={(event) => atualizar(index, { destinoId: event.target.value })}
                disabled={disabled}
              >
                <option value="">Selecione um bloco</option>
                {blocos.map((bloco) => (
                  <option key={bloco.id} value={bloco.id}>
                    {bloco.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <label className={styles.fallback}>
        <span>Se nenhuma regra for verdadeira, vá para</span>
        <select value={padraoId} onChange={(event) => onPadraoChange(event.target.value)} disabled={disabled}>
          <option value="">Selecione um bloco</option>
          {blocos.map((bloco) => (
            <option key={bloco.id} value={bloco.id}>
              {bloco.rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Escreva o CSS Module**

Crie `src/components/fluxo/condition-rules-editor.module.css`:

```css
.builder {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header span {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-transform: uppercase;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.empty {
  padding: 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
  background: var(--canvas);
}

.empty strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--ink);
}

.empty p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.limit {
  margin: 0;
  font-size: 12px;
  color: var(--warning);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.ruleHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.position {
  font-size: 12px;
  font-weight: 700;
  color: var(--green-600);
}

.ruleActions {
  display: flex;
  gap: 2px;
}

.ruleActions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.ruleActions button:hover:not(:disabled) {
  background: var(--canvas);
  color: var(--ink);
}

.ruleActions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rule label,
.fallback {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule label > span,
.fallback > span {
  font-size: 12px;
  color: var(--muted);
}

.fallback {
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
```

Todos os tokens usados acima já existem em `src/app/globals.css` (`--green-600`, `--ink`, `--muted`, `--line`, `--surface`, `--canvas`, `--warning`, `--radius-sm`, `--radius-md`, `--shadow-sm`). Não crie token novo.

- [ ] **Step 3: Verifique a compilação**

Run: `npm run lint && npm run typecheck`
Expected: PASS. `Button` aceita `variant` `'primary' | 'secondary' | 'ghost' | 'danger'` e `size` `'sm' | 'md' | 'icon'` (`src/components/ui/button.tsx:5-6`), então `variant="secondary" size="sm"` compila.

- [ ] **Step 4: Documente o padrão**

Em `DESIGN_SYSTEM.md`, acrescente uma subseção "Construtor de regras (bloco de condição)" descrevendo: cartão numerado por precedência, quatro campos em coluna (variável, comparação, valor, destino), ações de reordenar e remover como botões de 32 px com `aria-label`, rodapé separado por linha para a saída padrão, e estado vazio quando não há variável capturada antes.

- [ ] **Step 5: Commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write src/components/fluxo/condition-rules-editor.tsx
npx prettier@3.9.6 --print-width 120 --write src/components/fluxo/condition-rules-editor.module.css
npm run lint && npm run typecheck && npm test
git add src/components/fluxo/condition-rules-editor.tsx src/components/fluxo/condition-rules-editor.module.css DESIGN_SYSTEM.md
git commit -m "feat(ui): adiciona o construtor de regras do bloco de condicao"
```

---

### Task 7: Integração no editor

**Files:**
- Modify: `src/components/fluxo/flow-editor.tsx`

**Interfaces:**
- Consumes: `rulesToEdges`, `variaveisDisponiveis` (Task 2), `limiteDeRegras` (Task 5), `ConditionRulesEditor` (Task 6).
- Produces: nada consumido por tarefas seguintes.

- [ ] **Step 1: Remova o protótipo de arestas rotuladas**

Em `flow-editor.tsx`, no `prototypeNodes`, troque os dados do nó `no_2` (condição) para usar regras estruturadas e apague o campo `content`:

```ts
  {
    id: 'no_2',
    type: 'flowNode',
    position: { x: 310, y: 180 },
    data: {
      label: 'Condição',
      detail: 'Identificar intenção',
      kind: 'condition',
      icon: 'condition',
      content: '',
      regras: [{ id: 'regra_1', variavel: 'cliente.opcao', operador: '==' as const, valor: '1', destinoId: 'no_3' }],
      padraoId: 'no_4',
    },
  },
```

E reduza `prototypeEdges` a apenas a ligação que não é de condição:

```ts
const prototypeEdges: Edge[] = [{ id: 'e1', source: 'no_1', target: 'no_2', ...edgeDefaults }];
```

Reordene `prototypeNodes` para que a captura (`no_3`) venha antes da condição (`no_2`), de modo que a variável `cliente.opcao` exista antes de ser comparada. Mantenha `no_1` na primeira posição, que é o nó inicial.

- [ ] **Step 2: Derive as arestas da condição**

Acrescente os imports:

```ts
import { rulesToEdges, variaveisDisponiveis } from '@/features/flows/flow-rules';
import { limiteDeRegras } from '@/hooks/flows/use-flow-block-catalog';
import { ConditionRulesEditor } from './condition-rules-editor';
import type { FlowRule } from '@/features/flows/types';
```

Depois da declaração de `selected`, acrescente:

```ts
  // As arestas da condição são derivadas das regras; o estado `edges` guarda
  // apenas as ligações dos demais blocos, para não existirem duas cópias.
  const displayEdges = useMemo(
    () => [...edges, ...nodes.flatMap((node) => rulesToEdges(node).map((edge) => ({ ...edge, ...edgeDefaults })))],
    [edges, nodes],
  );
```

Passe `displayEdges` ao `ReactFlow` (`edges={displayEdges}`) e use-o em todas as chamadas que hoje passam `edges` para `validateGraph`, `graphToDefinition` e `markInvalidBlocks`.

- [ ] **Step 3: Faça o arraste criar uma regra**

Substitua `connect` por:

```ts
  const connect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source);
      if (source?.data.kind === 'team') return;
      if (source?.data.kind === 'condition') {
        // Arrastar continua funcionando: vira uma regra nova já com o destino.
        const disponiveis = variaveisDisponiveis(nodes, displayEdges, source.id);
        setNodes((current) =>
          current.map((node) => {
            if (node.id !== source.id) return node;
            const regras = node.data.regras ?? [];
            const rule: FlowRule = {
              id: nextRuleId(regras),
              variavel: disponiveis.length === 1 ? disponiveis[0] : '',
              operador: '==',
              valor: '',
              destinoId: connection.target ?? '',
            };
            return { ...node, data: { ...node.data, regras: [...regras, rule] } };
          }),
        );
        setSelectedId(source.id);
        return;
      }
      setEdges((current) => addEdge({ ...connection, ...edgeDefaults }, current));
    },
    [displayEdges, nodes, setEdges, setNodes],
  );
```

Acrescente `nextRuleId` ao import de `@/features/flows/flow-rules`.

- [ ] **Step 4: Limpe destinos ao apagar um bloco**

No `onNodesDelete` do `ReactFlow` e em `deleteSelected`, além de remover as arestas, limpe as referências:

```ts
  const limparReferencias = useCallback(
    (ids: Set<string>) =>
      setNodes((current) =>
        current.map((node) => {
          if (node.data.kind !== 'condition') return node;
          const regras = (node.data.regras ?? []).map((rule) =>
            ids.has(rule.destinoId) ? { ...rule, destinoId: '' } : rule,
          );
          const padraoId = ids.has(node.data.padraoId ?? '') ? '' : node.data.padraoId;
          return { ...node, data: { ...node.data, regras, padraoId } };
        }),
      ),
    [setNodes],
  );
```

Chame `limparReferencias(ids)` no `onNodesDelete` e `limparReferencias(new Set([selectedId]))` em `deleteSelected`.

- [ ] **Step 5: Monte o construtor no painel**

No painel de propriedades, o `selected.data.kind === 'team'` vira uma cadeia de três casos. Acrescente antes do ramo `team`:

```tsx
            {selected.data.kind === 'condition' ? (
              <ConditionRulesEditor
                regras={selected.data.regras ?? []}
                padraoId={selected.data.padraoId ?? ''}
                variaveis={variaveisDisponiveis(nodes, displayEdges, selected.id)}
                blocos={nodes
                  .filter((node) => node.id !== selected.id)
                  .map((node) => ({ id: node.id, rotulo: `${node.data.label}: ${node.data.detail}` }))}
                operadores={catalog.data?.linguagemCondicao.operadores ?? ['==', '!=']}
                maximoRegras={limiteDeRegras(catalog.data)}
                disabled={!canManage}
                onRulesChange={(regras) =>
                  setNodes((current) =>
                    current.map((node) =>
                      node.id === selected.id ? { ...node, data: { ...node.data, regras } } : node,
                    ),
                  )
                }
                onPadraoChange={(padraoId) =>
                  setNodes((current) =>
                    current.map((node) =>
                      node.id === selected.id ? { ...node, data: { ...node.data, padraoId } } : node,
                    ),
                  )
                }
              />
            ) : selected.data.kind === 'team' ? (
```

Os campos "Conteúdo / instrução", "Inserir variável" e "Prévia do conteúdo" ficam apenas no ramo final, que passa a valer só para mensagem e captura.

- [ ] **Step 6: Aponte o erro 422 para a regra**

Em `publish`, ao mapear `error.details`, leia também o campo:

```ts
        const details = error.details as
          | { erros?: Array<{ noId?: string; campo?: string; mensagem: string }> }
          | undefined;
        const errors = details?.erros ?? [];
        setNodes((current) =>
          current.map((node) => {
            const item = errors.find((erro) => erro.noId === node.id);
            if (!item) return { ...node, data: { ...node.data, validationError: undefined } };
            // `campo` chega como `dados.regras[0].se`; o índice identifica a regra.
            const posicao = /dados\.regras\[(\d+)\]/.exec(item.campo ?? '')?.[1];
            const mensagem = posicao ? `${Number(posicao) + 1}ª regra: ${item.mensagem}` : item.mensagem;
            return { ...node, data: { ...node.data, validationError: mensagem } };
          }),
        );
```

- [ ] **Step 7: Verifique tipos e testes**

Run: `npm run lint && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 8: Verifique na tela, ponta a ponta**

Com backend na 3000 e `npm run dev` na 3001, logado como `usuario@zapbot.local`:

1. Abra `/fluxos` e crie um fluxo novo.
2. Monte mensagem → capturar resposta (variável `opcao`) → condição → direcionar setor + mensagem de fallback.
3. No painel da condição, adicione uma regra: variável `opcao`, "é igual a", valor `1`, destino o bloco de setor. Confirme que a seta aparece sozinha no canvas com o rótulo "Se opcao é igual a 1".
4. Escolha a saída padrão como a mensagem de fallback. Confirme a seta "Senão".
5. Salvar, Publicar, Testar. Responda `1` e confirme o direcionamento; reinicie e responda `banana` e confirme o fallback.
6. Abra `/fluxos/38ea8399-2782-4dfb-9c97-087dbd7468ce` (fluxo "Teste do editor", criado com regra `cliente.opcao == "1"`) e confirme que a regra aparece preenchida no painel, sem perda.

- [ ] **Step 9: Commite**

```bash
npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write src/components/fluxo/flow-editor.tsx
npm run lint && npm run typecheck && npm test
git add src/components/fluxo/flow-editor.tsx
git commit -m "feat(flows): integra o construtor de regras ao editor de fluxos"
```

---

## Verificação final

- [ ] `npm run lint`, `npm run typecheck` e `npm test` passam.
- [ ] `npm run test:coverage` reporta `flow-rules.ts` na tabela.
- [ ] O fluxo montado inteiramente pela tela simula corretamente os dois ramos.
- [ ] Os dois fluxos existentes no tenant de desenvolvimento abrem com as regras preenchidas.
