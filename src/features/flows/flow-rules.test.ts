import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import {
  describeRule,
  nextRuleId,
  ordinal,
  parseRule,
  serializeRule,
  rulesToEdges,
  variaveisDisponiveis,
} from './flow-rules';
import type { FlowNodeData, FlowRule } from './types';

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

  it('marks an incomplete rule when the value is still empty', () => {
    expect(describeRule(rule({ valor: '' }))).toBe('Regra incompleta');
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

  it('lists variables extracted by an integration block that reaches the condition', () => {
    const nodes = [
      node('no_1', {
        kind: 'integration',
        mappings: [
          { id: 'mapa_1', variavel: 'pedido.status', caminho: '$.status' },
          { id: 'mapa_2', variavel: 'pedido.total', caminho: '$.total' },
        ],
      }),
      node('no_2', { kind: 'condition' }),
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'no_1', target: 'no_2' }];
    expect(variaveisDisponiveis(nodes, edges, 'no_2')).toEqual(['pedido.status', 'pedido.total']);
  });
});
