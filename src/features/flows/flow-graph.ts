import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { FlowDefinition } from './types';

export type FlowNodeData = { label: string; detail: string; kind: string; icon: string; content: string; validationError?: string };
export type FlowGraph = { nodes: Node<FlowNodeData>[]; edges: Edge[] };

const edgeStyle = { markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#63aa94', strokeWidth: 2 } };

function kindFromType(type: unknown) {
  if (type === 'mensagem' || type === 'captura_resposta') return 'message';
  if (type === 'condicao') return 'condition';
  if (type === 'direcionar_setor') return 'team';
  if (type === 'integracao_http') return 'http';
  return 'ai';
}

export function definitionToGraph(definition: FlowDefinition): FlowGraph {
  const nodes = definition.nos.map((raw, index) => {
    const id = String(raw.id);
    const type = raw.tipo;
    const data = (raw.dados ?? {}) as Record<string, unknown>;
    const kind = kindFromType(type);
    const content = String(data.texto ?? data.mensagem ?? data.setorId ?? data.prompt ?? '');
    return { id, type: 'flowNode', position: { x: 120 + (index % 3) * 280, y: 60 + Math.floor(index / 3) * 150 }, data: { label: String(type), detail: id, kind, icon: kind, content } } satisfies Node<FlowNodeData>;
  });
  const edges: Edge[] = [];
  definition.nos.forEach((raw) => {
    const source = String(raw.id);
    if (typeof raw.proximo === 'string') edges.push({ id: `${source}-${raw.proximo}`, source, target: raw.proximo, ...edgeStyle });
    const data = (raw.dados ?? {}) as Record<string, unknown>;
    if (Array.isArray(data.regras)) data.regras.forEach((rule, index) => { const item = rule as Record<string, unknown>; if (typeof item.entao === 'string') edges.push({ id: `${source}-regra-${index}`, source, target: item.entao, label: String(item.se ?? ''), ...edgeStyle }); });
    if (typeof data.padrao === 'string') edges.push({ id: `${source}-padrao`, source, target: data.padrao, label: 'Padrão', ...edgeStyle });
  });
  return { nodes, edges };
}

export function graphToDefinition(nodes: Node<FlowNodeData>[], edges: Edge[]): FlowDefinition {
  const firstNode = nodes[0]?.id ?? 'inicio';
  return {
    schemaVersao: 1,
    noInicial: firstNode,
    nos: nodes.map((node) => {
      const outgoing = edges.filter((edge) => edge.source === node.id);
      if (node.data.kind === 'condition') return { id: node.id, tipo: 'condicao', dados: { regras: outgoing.filter((edge) => edge.label !== 'Padrão').map((edge, index) => ({ se: String(edge.label ?? `opcao == "${index + 1}"`), entao: edge.target })), ...(outgoing.find((edge) => edge.label === 'Padrão') ? { padrao: outgoing.find((edge) => edge.label === 'Padrão')?.target } : {}) } };
      if (node.data.kind === 'team') return { id: node.id, tipo: 'direcionar_setor', dados: { setorId: node.data.content } };
      const tipo = node.data.kind === 'http' ? 'integracao_http' : node.data.kind === 'ai' ? 'ia' : 'mensagem';
      return { id: node.id, tipo, dados: tipo === 'mensagem' ? { texto: node.data.content } : { configuracao: node.data.content }, ...(outgoing[0] ? { proximo: outgoing[0].target } : {}) };
    }),
  };
}
