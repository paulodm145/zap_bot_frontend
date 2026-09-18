import type { FlowResponseMapping } from './types';

/** Espelha `variavelFluxoSchema` do backend. */
export const PADRAO_VARIAVEL = /^[A-Za-z_][A-Za-z0-9_.]{0,79}$/;

/** Espelha `caminhoExtracaoSchema` do backend: navegação por chave e índice, sem `eval`. */
export const PADRAO_CAMINHO = /^\$(\.[A-Za-z_][A-Za-z0-9_]*|\[\d{1,4}\])+$/;

/** Deriva o próximo id do maior já presente, como `nextRuleId` faz com as regras de condição. */
export function nextMappingId(mapeamentos: FlowResponseMapping[]): string {
  const highest = mapeamentos.reduce((max, mapping) => {
    const match = /^mapa_(\d+)$/.exec(mapping.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mapa_${highest + 1}`;
}

/** `{ variavel: caminho }`, formato aceito pelo backend em `dados.mapeamentoResposta`. */
export function mappingsToRecord(mapeamentos: FlowResponseMapping[]): Record<string, string> {
  return Object.fromEntries(
    mapeamentos
      .filter((mapping) => mapping.variavel !== '' && mapping.caminho !== '')
      .map((mapping) => [mapping.variavel, mapping.caminho]),
  );
}

/** Reconstrói a lista editável a partir do objeto salvo pelo backend. */
export function recordToMappings(registro: Record<string, unknown>): FlowResponseMapping[] {
  return Object.entries(registro).map(([variavel, caminho], index) => ({
    id: `mapa_${index + 1}`,
    variavel,
    caminho: String(caminho ?? ''),
  }));
}
