import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { FlowDefinition, FlowHttpMethod, FlowNodeData } from './types';
import { ordinal, parseRule, serializeRule, variaveisDisponiveis } from './flow-rules';
import { mappingsToRecord, recordToMappings } from './flow-mappings';
import { METODOS_HTTP } from './flow-catalog';

export type { FlowNodeData } from './types';
export type FlowGraph = { nodes: Node<FlowNodeData>[]; edges: Edge[] };

const edgeStyle = { markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#63aa94', strokeWidth: 2 } };

/** Valida `raw.posicao` sem confiar no formato vindo do backend (`unknown`). */
function posicaoSalva(raw: unknown): { x: number; y: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { x, y } = raw as Record<string, unknown>;
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  return { x, y };
}

function kindFromType(type: unknown) {
  if (type === 'mensagem') return 'message';
  if (type === 'captura_resposta') return 'capture';
  if (type === 'condicao') return 'condition';
  if (type === 'direcionar_setor') return 'team';
  if (type === 'integracao_http') return 'integration';
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
      // Fluxos salvos por esta versão do editor trazem `posicao`; a grade só
      // serve de layout inicial para fluxos antigos ou blocos novos ainda sem
      // posição salva.
      position: posicaoSalva(raw.posicao) ?? {
        x: 120 + (index % 3) * 280,
        y: 60 + Math.floor(index / 3) * 150,
      },
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
        ...(kind === 'integration'
          ? {
              credentialId: typeof data.credencialId === 'string' ? data.credencialId : '',
              method: (METODOS_HTTP as string[]).includes(String(data.metodo))
                ? (data.metodo as FlowHttpMethod)
                : 'GET',
              url: typeof data.url === 'string' ? data.url : '',
              ...(typeof data.corpo === 'string' ? { requestBody: data.corpo } : {}),
              mappings: recordToMappings(
                typeof data.mapeamentoResposta === 'object' && data.mapeamentoResposta !== null
                  ? (data.mapeamentoResposta as Record<string, unknown>)
                  : {},
              ),
              ...(typeof raw.sucesso === 'string' ? { successId: raw.sucesso } : {}),
              ...(typeof raw.falha === 'string' ? { failureId: raw.falha } : {}),
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
    if (typeof raw.sucesso === 'string')
      edges.push({
        id: `${source}-sucesso`,
        source,
        sourceHandle: 'sucesso',
        target: raw.sucesso,
        label: 'Sucesso',
        ...edgeStyle,
      });
    if (typeof raw.falha === 'string')
      edges.push({
        id: `${source}-falha`,
        source,
        sourceHandle: 'falha',
        target: raw.falha,
        label: 'Falha',
        ...edgeStyle,
      });
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
/** Espelha `caminhoExtracaoSchema` do backend. */
const caminhoPattern = /^\$(\.[A-Za-z_][A-Za-z0-9_]*|\[\d{1,4}\])+$/;

function validateIntegration(node: Node<FlowNodeData>): string | undefined {
  if (!node.data.credentialId) return 'Selecione a integração que este bloco vai chamar.';
  if (!node.data.url?.trim()) return 'Informe a URL da chamada.';
  for (const [index, mapping] of (node.data.mappings ?? []).entries()) {
    if (!mapping.variavel && !mapping.caminho) continue;
    if (!mapping.variavel || !variablePattern.test(mapping.variavel))
      return `O campo da resposta na posição ${String(index + 1)} tem nome de variável inválido.`;
    if (!mapping.caminho || !caminhoPattern.test(mapping.caminho))
      return `O campo da resposta na posição ${String(index + 1)} tem caminho inválido. Use algo como $.dados.status.`;
  }
  return undefined;
}

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
    } else if (node.data.kind === 'integration') {
      const message = validateIntegration(node);
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
      const posicao = { x: node.position.x, y: node.position.y };
      if (node.data.kind === 'condition') {
        const regras = (node.data.regras ?? []).filter((rule) => rule.variavel !== '' && rule.destinoId !== '');
        return {
          id: node.id,
          tipo: 'condicao',
          dados: {
            regras: regras.map((rule) => ({ se: serializeRule(rule), entao: rule.destinoId })),
            padrao: node.data.padraoId ?? '',
          },
          posicao,
        };
      }
      if (node.data.kind === 'team')
        return {
          id: node.id,
          tipo: 'direcionar_setor',
          dados: { setorId: node.data.sectorId ?? '' },
          posicao,
        };
      if (node.data.kind === 'integration') {
        const sucesso = outgoing.find((edge) => edge.sourceHandle === 'sucesso')?.target;
        const falha = outgoing.find((edge) => edge.sourceHandle === 'falha')?.target;
        return {
          id: node.id,
          tipo: 'integracao_http',
          dados: {
            credencialId: node.data.credentialId ?? '',
            metodo: node.data.method ?? 'GET',
            url: node.data.url ?? '',
            ...(node.data.requestBody ? { corpo: node.data.requestBody } : {}),
            mapeamentoResposta: mappingsToRecord(node.data.mappings ?? []),
          },
          ...(sucesso ? { sucesso } : {}),
          ...(falha ? { falha } : {}),
          posicao,
        };
      }
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
        posicao,
      };
    }),
  };
}
