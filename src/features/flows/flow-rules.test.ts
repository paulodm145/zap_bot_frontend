import { describe, expect, it } from 'vitest';
import { describeRule, nextRuleId, ordinal, parseRule, serializeRule } from './flow-rules';
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
