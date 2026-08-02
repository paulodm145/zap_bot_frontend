import { describe, expect, it } from 'vitest';
import { definitionToGraph, graphToDefinition, type FlowGraph } from './flow-graph';

describe('flow graph contract conversion', () => {
  it('converts backend nodes and references into visual nodes and edges', () => {
    const graph = definitionToGraph({ schemaVersao: 1, noInicial: 'inicio', nos: [
      { id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá' }, proximo: 'decidir' },
      { id: 'decidir', tipo: 'condicao', dados: { regras: [{ se: 'opcao == "1"', entao: 'fiscal' }], padrao: 'fim' } },
      { id: 'fiscal', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' } },
      { id: 'fim', tipo: 'mensagem', dados: { texto: 'Fim' } },
    ] });
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes[0].data.content).toBe('Olá');
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'inicio', target: 'decidir' }),
      expect.objectContaining({ source: 'decidir', target: 'fiscal', label: 'opcao == "1"' }),
      expect.objectContaining({ source: 'decidir', target: 'fim', label: 'Padrão' }),
    ]));
  });

  it('serializes visual message connections and sector nodes', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'inicio', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'Mensagem', detail: 'Início', kind: 'message', icon: 'message', content: 'Olá' } },
        { id: 'setor', type: 'flowNode', position: { x: 0, y: 100 }, data: { label: 'Setor', detail: 'Fiscal', kind: 'team', icon: 'team', content: 'setor-1' } },
      ],
      edges: [{ id: 'e1', source: 'inicio', target: 'setor' }],
    };
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual({ schemaVersao: 1, noInicial: 'inicio', nos: [
      { id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá' }, proximo: 'setor' },
      { id: 'setor', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' } },
    ] });
  });
});
