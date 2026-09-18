import { describe, expect, it } from 'vitest';
import { mappingsToRecord, nextMappingId, PADRAO_CAMINHO, PADRAO_VARIAVEL, recordToMappings } from './flow-mappings';
import type { FlowResponseMapping } from './types';

describe('nextMappingId', () => {
  it('starts after the highest generated id already in the list', () => {
    expect(
      nextMappingId([
        { id: 'mapa_1', variavel: '', caminho: '' },
        { id: 'mapa_3', variavel: '', caminho: '' },
      ]),
    ).toBe('mapa_4');
  });

  it('starts at one for an empty list', () => {
    expect(nextMappingId([])).toBe('mapa_1');
  });
});

describe('mappingsToRecord', () => {
  it('converts the editable list into the object the backend accepts', () => {
    const mappings: FlowResponseMapping[] = [
      { id: 'mapa_1', variavel: 'pedido.status', caminho: '$.status' },
      { id: 'mapa_2', variavel: 'pedido.total', caminho: '$.total' },
    ];
    expect(mappingsToRecord(mappings)).toEqual({ 'pedido.status': '$.status', 'pedido.total': '$.total' });
  });

  it('omits an incomplete pair instead of sending an empty key or value', () => {
    const mappings: FlowResponseMapping[] = [
      { id: 'mapa_1', variavel: '', caminho: '$.status' },
      { id: 'mapa_2', variavel: 'pedido.total', caminho: '' },
    ];
    expect(mappingsToRecord(mappings)).toEqual({});
  });
});

describe('recordToMappings', () => {
  it('reconstructs an editable list from the object saved by the backend', () => {
    expect(recordToMappings({ 'pedido.status': '$.status' })).toEqual([
      { id: 'mapa_1', variavel: 'pedido.status', caminho: '$.status' },
    ]);
  });

  it('round-trips through mappingsToRecord and back', () => {
    const original: FlowResponseMapping[] = [{ id: 'mapa_1', variavel: 'status', caminho: '$.status' }];
    expect(recordToMappings(mappingsToRecord(original))).toEqual(original);
  });
});

describe('variable and path patterns', () => {
  it.each(['status', 'pedido.status', '_interno'])('accepts variable name %s', (nome) => {
    expect(PADRAO_VARIAVEL.test(nome)).toBe(true);
  });

  it.each(['1invalido', 'com espaço', ''])('rejects variable name %s', (nome) => {
    expect(PADRAO_VARIAVEL.test(nome)).toBe(false);
  });

  it.each(['$.status', '$.dados.itens[0].status', '$.a[12]'])('accepts path %s', (caminho) => {
    expect(PADRAO_CAMINHO.test(caminho)).toBe(true);
  });

  it.each(['status', '$status', '$.', ''])('rejects path %s', (caminho) => {
    expect(PADRAO_CAMINHO.test(caminho)).toBe(false);
  });
});
