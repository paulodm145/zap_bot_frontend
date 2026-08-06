import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { FlowDefinition, FlowNodeData } from './types';

export type { FlowNodeData } from './types';
export type FlowGraph = { nodes: Node<FlowNodeData>[]; edges: Edge[] };

const edgeStyle = { markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#63aa94', strokeWidth: 2 } };

function kindFromType(type: unknown) {
  if (type === 'mensagem') return 'message';
  if (type === 'captura_resposta') return 'capture';
  if (type === 'condicao') return 'condition';
  if (type === 'direcionar_setor') return 'team';
  return 'message';
}

export function definitionToGraph(definition: FlowDefinition): FlowGraph {
  // O nó de entrada vem primeiro: graphToDefinition deriva `noInicial` da
  // primeira posição, então a ordem do array precisa refletir o contrato.
  const ordered = [...definition.nos].sort((left, right) => {
    if (String(left.id) === definition.noInicial) return -1;
    if (String(right.id) === definition.noInicial) return 1;
    return 0;
  });
  const nodes = ordered.map((raw, index) => {
    const id = String(raw.id);
    const type = raw.tipo;
    const data = (raw.dados ?? {}) as Record<string, unknown>;
    const kind = kindFromType(type);
    const content = String(data.texto ?? data.mensagem ?? data.prompt ?? '');
    return {
      id,
      type: 'flowNode',
      position: { x: 120 + (index % 3) * 280, y: 60 + Math.floor(index / 3) * 150 },
      data: {
        label: String(type),
        detail: id,
        kind,
        icon: kind,
        content,
        ...(kind === 'team' && typeof data.setorId === 'string' ? { sectorId: data.setorId } : {}),
        ...(kind === 'capture' && typeof data.variavel === 'string' ? { variable: data.variavel } : {}),
      },
    } satisfies Node<FlowNodeData>;
  });
  const edges: Edge[] = [];
  definition.nos.forEach((raw) => {
    const source = String(raw.id);
    if (typeof raw.proximo === 'string')
      edges.push({ id: `${source}-${raw.proximo}`, source, target: raw.proximo, ...edgeStyle });
    const data = (raw.dados ?? {}) as Record<string, unknown>;
    if (Array.isArray(data.regras))
      data.regras.forEach((rule, index) => {
        const item = rule as Record<string, unknown>;
        if (typeof item.entao === 'string')
          edges.push({
            id: `${source}-regra-${index}`,
            source,
            target: item.entao,
            label: String(item.se ?? ''),
            ...edgeStyle,
          });
      });
    if (typeof data.padrao === 'string')
      edges.push({ id: `${source}-padrao`, source, target: data.padrao, label: 'Padrão', ...edgeStyle });
  });
  return { nodes, edges };
}

/**
 * Deriva o próximo id do maior já presente no grafo. Um contador fixo colidia
 * com os ids de um fluxo salvo e reaberto, gerando blocos duplicados.
 */
export function nextNodeId(nodes: Node<FlowNodeData>[]): string {
  const highest = nodes.reduce((max, node) => {
    const match = /^no_(\d+)$/.exec(node.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `no_${highest + 1}`;
}

export type GraphValidationIssue = { nodeId: string; message: string };

/** Espelha `variavelFluxoSchema` do backend. */
const variablePattern = /^[A-Za-z_][A-Za-z0-9_.]{0,79}$/;

/** Espelha `EXPRESSAO_COMPARACAO` de `condicao-fluxo.helper.ts` no backend. */
const conditionPattern = /^\s*[A-Za-z_][A-Za-z0-9_.]{0,79}\s*(==|!=)\s*(['"])[^'"]*\2\s*$/;

/**
 * Aponta o bloco incompleto antes do envio. O backend valida a definição
 * inteira e responde 400 sem identificar o nó, então a checagem local é o que
 * permite destacar o bloco culpado na tela.
 */
export function validateGraph(nodes: Node<FlowNodeData>[], edges: Edge[]): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  for (const node of nodes) {
    const outgoing = edges.filter((edge) => edge.source === node.id);
    if (node.data.kind === 'team' && !node.data.sectorId) {
      issues.push({ nodeId: node.id, message: 'Selecione o setor que receberá a conversa.' });
    } else if (node.data.kind === 'capture' && !variablePattern.test(node.data.variable ?? '')) {
      issues.push({ nodeId: node.id, message: 'Informe a variável que guardará a resposta.' });
    } else if (node.data.kind === 'condition' && outgoing.length < 2) {
      issues.push({ nodeId: node.id, message: 'Conecte ao menos duas saídas: uma regra e o caminho padrão.' });
    } else if (
      node.data.kind === 'condition' &&
      // A saída padrão não é uma comparação; as demais são interpretadas pelo motor.
      outgoing.some((edge) => edge.label !== 'Padrão' && edge.label && !conditionPattern.test(String(edge.label)))
    ) {
      issues.push({ nodeId: node.id, message: 'Use o formato variavel == "valor" nas saídas da condição.' });
    } else if (node.data.kind === 'message' && !node.data.content.trim()) {
      issues.push({ nodeId: node.id, message: 'Escreva o texto que o bot vai enviar.' });
    }
  }
  return issues;
}

export function graphToDefinition(nodes: Node<FlowNodeData>[], edges: Edge[]): FlowDefinition {
  const firstNode = nodes[0]?.id ?? 'inicio';
  return {
    schemaVersao: 1,
    noInicial: firstNode,
    nos: nodes.map((node) => {
      const outgoing = edges.filter((edge) => edge.source === node.id);
      if (node.data.kind === 'condition') {
        // `padrao` é obrigatório no backend. Uma aresta rotulada "Padrão" tem
        // precedência; sem ela, a última saída vira o caminho de fallback.
        const marked = outgoing.find((edge) => edge.label === 'Padrão');
        const fallback = marked ?? outgoing[outgoing.length - 1];
        return {
          id: node.id,
          tipo: 'condicao',
          dados: {
            regras: outgoing
              .filter((edge) => edge !== fallback)
              .map((edge, index) => ({ se: String(edge.label ?? `opcao == "${index + 1}"`), entao: edge.target })),
            padrao: fallback?.target ?? '',
          },
        };
      }
      if (node.data.kind === 'team')
        return { id: node.id, tipo: 'direcionar_setor', dados: { setorId: node.data.sectorId ?? '' } };
      const tipo = node.data.kind === 'capture' ? 'captura_resposta' : 'mensagem';
      return {
        id: node.id,
        tipo,
        dados:
          tipo === 'mensagem'
            ? { texto: node.data.content }
            : // `mensagem` é opcional, mas quando presente exige ao menos 1 caractere.
              { variavel: node.data.variable ?? '', ...(node.data.content ? { mensagem: node.data.content } : {}) },
        ...(outgoing[0] ? { proximo: outgoing[0].target } : {}),
      };
    }),
  };
}
