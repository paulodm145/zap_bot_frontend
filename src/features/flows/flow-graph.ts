import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { FlowDefinition, FlowNodeData } from './types';
import { ordinal, parseRule, serializeRule, variaveisDisponiveis } from './flow-rules';

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
      },
    } satisfies Node<FlowNodeData>;
  });
  const edges: Edge[] = [];
  definition.nos.forEach((raw) => {
    const source = String(raw.id);
    if (typeof raw.proximo === 'string')
      edges.push({ id: `${source}-${raw.proximo}`, source, target: raw.proximo, ...edgeStyle });
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

/** Espelha `maximoCaracteres` do campo `dados.regras` no catálogo do backend. */
const MAXIMO_CARACTERES_REGRA = 300;

function validateCondition(node: Node<FlowNodeData>, nodes: Node<FlowNodeData>[], edges: Edge[]): string | undefined {
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

/**
 * Aponta o bloco incompleto antes do envio. O backend valida a definição
 * inteira e responde 400 sem identificar o nó, então a checagem local é o que
 * permite destacar o bloco culpado na tela.
 */
export function validateGraph(nodes: Node<FlowNodeData>[], edges: Edge[]): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  for (const node of nodes) {
    if (node.data.kind === 'team' && !node.data.sectorId) {
      issues.push({ nodeId: node.id, message: 'Selecione o setor que receberá a conversa.' });
    } else if (node.data.kind === 'capture' && !variablePattern.test(node.data.variable ?? '')) {
      issues.push({ nodeId: node.id, message: 'Informe a variável que guardará a resposta.' });
    } else if (node.data.kind === 'condition') {
      const message = validateCondition(node, nodes, edges);
      if (message) issues.push({ nodeId: node.id, message });
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
