import type { Edge, Node } from '@xyflow/react';
import type { FlowNodeData, FlowRule, FlowRuleOperator } from './types';

/** Espelha `EXPRESSAO_COMPARACAO` de `condicao-fluxo.helper.ts` no backend. */
const EXPRESSAO = /^\s*([A-Za-z_][A-Za-z0-9_.]{0,79})\s*(==|!=)\s*(['"])([^'"]*)\3\s*$/;

export const ROTULO_OPERADOR: Record<FlowRuleOperator, string> = {
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
