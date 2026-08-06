import { describe, expect, it } from 'vitest';
import {
  definitionToGraph,
  graphToDefinition,
  nextNodeId,
  validateGraph,
  type FlowGraph,
  type FlowNodeData,
} from './flow-graph';

function node(id: string, data: Partial<FlowNodeData>): FlowGraph['nodes'][number] {
  return {
    id,
    type: 'flowNode',
    position: { x: 0, y: 0 },
    data: { label: '', detail: id, kind: 'message', icon: 'message', content: '', ...data },
  };
}

const message = (id: string, content: string) => node(id, { kind: 'message', icon: 'message', content });
const condition = (id: string) => node(id, { kind: 'condition', icon: 'condition' });

describe('flow graph contract conversion', () => {
  it('converts backend nodes and references into visual nodes and edges', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'inicio',
      nos: [
        { id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá' }, proximo: 'decidir' },
        {
          id: 'decidir',
          tipo: 'condicao',
          dados: { regras: [{ se: 'opcao == "1"', entao: 'fiscal' }], padrao: 'fim' },
        },
        { id: 'fiscal', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' } },
        { id: 'fim', tipo: 'mensagem', dados: { texto: 'Fim' } },
      ],
    });
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes[0].data.content).toBe('Olá');
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'inicio', target: 'decidir' }),
        expect.objectContaining({ source: 'decidir', target: 'fiscal', label: 'opcao == "1"' }),
        expect.objectContaining({ source: 'decidir', target: 'fim', label: 'Padrão' }),
      ]),
    );
  });

  it('serializes visual message connections and sector nodes', () => {
    const graph: FlowGraph = {
      nodes: [
        {
          id: 'inicio',
          type: 'flowNode',
          position: { x: 0, y: 0 },
          data: { label: 'Mensagem', detail: 'Início', kind: 'message', icon: 'message', content: 'Olá' },
        },
        {
          id: 'setor',
          type: 'flowNode',
          position: { x: 0, y: 100 },
          data: { label: 'Setor', detail: 'Fiscal', kind: 'team', icon: 'team', content: '', sectorId: 'setor-1' },
        },
      ],
      edges: [{ id: 'e1', source: 'inicio', target: 'setor' }],
    };
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual({
      schemaVersao: 1,
      noInicial: 'inicio',
      nos: [
        { id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá' }, proximo: 'setor' },
        { id: 'setor', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' } },
      ],
    });
  });

  it('preserves the selected sector when loading and saving a flow', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'atendimento',
      nos: [
        { id: 'atendimento', tipo: 'direcionar_setor', dados: { setorId: '11111111-1111-4111-8111-111111111111' } },
      ],
    };
    const graph = definitionToGraph(definition);
    expect(graph.nodes[0].data.sectorId).toBe('11111111-1111-4111-8111-111111111111');
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual(definition);
  });

  it('round-trips the supported response capture node', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'captura',
      nos: [{ id: 'captura', tipo: 'captura_resposta', dados: { variavel: 'opcao', mensagem: 'Qual opção?' } }],
    });
    expect(graph.nodes[0].data.kind).toBe('capture');
    expect(graphToDefinition(graph.nodes, graph.edges).nos[0]).toEqual({
      id: 'captura',
      tipo: 'captura_resposta',
      dados: { variavel: 'opcao', mensagem: 'Qual opção?' },
    });
  });

  // O backend exige `variavel` em captura_resposta (noCapturaSchema, strict).
  // Sem isso o PUT /fluxos/:id falha com 400 e o fluxo nunca chega a publicar.
  it('preserves the capture variable when loading and saving', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'captura',
      nos: [{ id: 'captura', tipo: 'captura_resposta', dados: { variavel: 'cliente.opcao', mensagem: 'Escolha' } }],
    });
    expect(graph.nodes[0].data.variable).toBe('cliente.opcao');
    expect(graphToDefinition(graph.nodes, graph.edges).nos[0]).toMatchObject({
      dados: { variavel: 'cliente.opcao' },
    });
  });

  // `padrao` é obrigatório em noCondicaoSchema. Sem aresta "Padrão" o editor
  // omitia o campo e o backend rejeitava a definição inteira.
  it('always emits a default branch for condition nodes', () => {
    const nodes: FlowGraph['nodes'] = [
      condition('decidir'),
      message('a', 'A'),
      message('b', 'B'),
    ];
    const edges = [
      { id: 'e1', source: 'decidir', target: 'a', label: 'opcao == "1"' },
      { id: 'e2', source: 'decidir', target: 'b', label: 'opcao == "2"' },
    ];
    const node = graphToDefinition(nodes, edges).nos[0] as {
      dados: { regras: Array<{ se: string; entao: string }>; padrao: string };
    };
    expect(node.dados.padrao).toBe('b');
    expect(node.dados.regras).toEqual([{ se: 'opcao == "1"', entao: 'a' }]);
  });

  // noInicial precisa acompanhar o nó de entrada real, não a ordem do array.
  it('keeps the declared entry node when it is not the first in the list', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'segundo',
      nos: [
        { id: 'primeiro', tipo: 'mensagem', dados: { texto: 'A' } },
        { id: 'segundo', tipo: 'mensagem', dados: { texto: 'B' } },
      ],
    };
    const graph = definitionToGraph(definition);
    expect(graphToDefinition(graph.nodes, graph.edges).noInicial).toBe('segundo');
  });
});

// O backend valida a definição inteira e responde 400 sem apontar o bloco.
// Estas regras espelham os schemas de `noFluxoSchema` para que o editor
// bloqueie antes do envio e destaque o bloco culpado.
describe('flow graph validation', () => {
  it('accepts a complete graph', () => {
    const nodes = [message('inicio', 'Olá'), node('fila', { kind: 'team', sectorId: 'setor-1' })];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'inicio', target: 'fila' }])).toEqual([]);
  });

  it('rejects a message without text', () => {
    expect(validateGraph([message('inicio', '   ')], [])).toEqual([
      { nodeId: 'inicio', message: 'Escreva o texto que o bot vai enviar.' },
    ]);
  });

  it('rejects a capture without a variable name', () => {
    const issues = validateGraph([node('captura', { kind: 'capture', content: 'Escolha' })], []);
    expect(issues).toEqual([{ nodeId: 'captura', message: 'Informe a variável que guardará a resposta.' }]);
  });

  it('rejects a capture whose variable has invalid characters', () => {
    const issues = validateGraph([node('captura', { kind: 'capture', content: 'Oi', variable: '1 opção' })], []);
    expect(issues).toHaveLength(1);
    expect(issues[0].nodeId).toBe('captura');
  });

  it('rejects a sector node without a selected sector', () => {
    expect(validateGraph([node('fila', { kind: 'team', sectorId: '' })], [])).toEqual([
      { nodeId: 'fila', message: 'Selecione o setor que receberá a conversa.' },
    ]);
  });

  it('rejects a condition with a single outgoing branch', () => {
    const nodes = [condition('decidir'), message('a', 'A')];
    const issues = validateGraph(nodes, [{ id: 'e1', source: 'decidir', target: 'a', label: 'x' }]);
    expect(issues).toEqual([
      { nodeId: 'decidir', message: 'Conecte ao menos duas saídas: uma regra e o caminho padrão.' },
    ]);
  });

  it('accepts a condition with a rule and a default branch', () => {
    const nodes = [condition('decidir'), message('a', 'A'), message('b', 'B')];
    const issues = validateGraph(nodes, [
      { id: 'e1', source: 'decidir', target: 'a', label: 'opcao == "1"' },
      { id: 'e2', source: 'decidir', target: 'b', label: 'Padrão' },
    ]);
    expect(issues).toEqual([]);
  });
});

// O motor interpreta cada regra com `interpretarCondicao` e lança ValidacaoError
// fora do formato `variavel == "valor"`. O schema aceita qualquer string, então
// só a checagem local evita um fluxo que publica mas quebra ao simular.
describe('condition rule expressions', () => {
  it('rejects a branch label that is not a comparison', () => {
    const nodes = [condition('decidir'), message('a', 'A'), message('b', 'B')];
    const issues = validateGraph(nodes, [
      { id: 'e1', source: 'decidir', target: 'a', label: 'Suporte' },
      { id: 'e2', source: 'decidir', target: 'b', label: 'Padrão' },
    ]);
    expect(issues).toEqual([
      { nodeId: 'decidir', message: 'Use o formato variavel == "valor" nas saídas da condição.' },
    ]);
  });

  it('accepts comparison operators supported by the engine', () => {
    const nodes = [condition('decidir'), message('a', 'A'), message('b', 'B'), message('c', 'C')];
    const issues = validateGraph(nodes, [
      { id: 'e1', source: 'decidir', target: 'a', label: 'cliente.opcao == "1"' },
      { id: 'e2', source: 'decidir', target: 'b', label: 'cliente.opcao != "2"' },
      { id: 'e3', source: 'decidir', target: 'c', label: 'Padrão' },
    ]);
    expect(issues).toEqual([]);
  });
});

// O editor gerava ids a partir de um contador fixo em 10. Um fluxo salvo com
// no_10..no_12 e reaberto passava a criar blocos com id duplicado, o que
// corrompe a definição enviada ao backend.
describe('node id generation', () => {
  it('starts after the highest generated id already in the graph', () => {
    expect(nextNodeId([node('no_3', {}), node('no_12', {}), node('no_7', {})])).toBe('no_13');
  });

  it('ignores ids that do not follow the generated pattern', () => {
    expect(nextNodeId([node('atendimento', {}), node('no_2', {})])).toBe('no_3');
  });

  it('starts at one for an empty graph', () => {
    expect(nextNodeId([])).toBe('no_1');
  });
});
