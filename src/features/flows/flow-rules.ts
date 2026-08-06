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
