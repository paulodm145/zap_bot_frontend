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
    // As arestas da condição são derivadas por rulesToEdges, não devolvidas aqui.
    expect(graph.edges).toEqual([expect.objectContaining({ source: 'inicio', target: 'decidir' })]);
    expect(graph.nodes[1].data.regras).toEqual([
      { id: 'decidir-regra-1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'fiscal' },
    ]);
    expect(graph.nodes[1].data.padraoId).toBe('fim');
  });

  it('keeps an unsupported expression visible as an incomplete rule', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'decidir',
      nos: [{ id: 'decidir', tipo: 'condicao', dados: { regras: [{ se: 'Suporte', entao: 'a' }], padrao: 'b' } }],
    });
    expect(graph.nodes[0].data.regras).toEqual([
      { id: 'decidir-regra-1', variavel: '', operador: '==', valor: 'Suporte', destinoId: 'a' },
    ]);
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
        {
          id: 'inicio',
          tipo: 'mensagem',
          dados: { texto: 'Olá' },
          proximo: 'setor',
          posicao: { x: 0, y: 0 },
        },
        { id: 'setor', tipo: 'direcionar_setor', dados: { setorId: 'setor-1' }, posicao: { x: 0, y: 100 } },
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
    // A definição de entrada não tinha `posicao`: definitionToGraph gera uma
    // posição inicial em grade, que passa a ser salva no primeiro round-trip.
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual({
      ...definition,
      nos: [{ ...definition.nos[0], posicao: { x: 120, y: 60 } }],
    });
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
      posicao: { x: 120, y: 60 },
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

  it('serializes structured rules and the default branch', () => {
    const nodes: FlowGraph['nodes'] = [
      node('decidir', {
        kind: 'condition',
        icon: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: 'opcao', operador: '!=', valor: '2', destinoId: 'b' },
        ],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(graphToDefinition(nodes, []).nos[0]).toEqual({
      id: 'decidir',
      tipo: 'condicao',
      dados: {
        regras: [
          { se: 'opcao == "1"', entao: 'a' },
          { se: 'opcao != "2"', entao: 'b' },
        ],
        padrao: 'b',
      },
      posicao: { x: 0, y: 0 },
    });
  });

  it('omits incomplete rules when serializing', () => {
    const nodes: FlowGraph['nodes'] = [
      node('decidir', {
        kind: 'condition',
        icon: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: '', operador: '==', valor: '', destinoId: '' },
        ],
        padraoId: 'b',
      }),
    ];
    const dados = (graphToDefinition(nodes, []).nos[0] as { dados: { regras: unknown[] } }).dados;
    expect(dados.regras).toHaveLength(1);
  });

  it('round-trips a condition through the backend contract', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'decidir',
      nos: [
        { id: 'decidir', tipo: 'condicao', dados: { regras: [{ se: 'opcao == "1"', entao: 'a' }], padrao: 'b' } },
        { id: 'a', tipo: 'mensagem', dados: { texto: 'A' } },
        { id: 'b', tipo: 'mensagem', dados: { texto: 'B' } },
      ],
    };
    const graph = definitionToGraph(definition);
    // Mesma observação do teste de setor: sem `posicao` na entrada, a grade
    // inicial é o que sai no primeiro round-trip.
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual({
      ...definition,
      nos: [
        { ...definition.nos[0], posicao: { x: 120, y: 60 } },
        { ...definition.nos[1], posicao: { x: 400, y: 60 } },
        { ...definition.nos[2], posicao: { x: 680, y: 60 } },
      ],
    });
  });

  // Antes desta correção, a posição salva era descartada: definitionToGraph
  // sempre recalculava uma grade, e o usuário via os blocos se reorganizarem
  // sozinhos a cada vez que reabria o fluxo.
  it('preserves the exact position saved for each block, without recomputing the grid', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'inicio',
      nos: [
        { id: 'inicio', tipo: 'mensagem', dados: { texto: 'A' }, posicao: { x: 733, y: -42 } },
        { id: 'fim', tipo: 'mensagem', dados: { texto: 'B' }, posicao: { x: -10, y: 900 } },
      ],
    };
    const graph = definitionToGraph(definition);
    expect(graph.nodes[0].position).toEqual({ x: 733, y: -42 });
    expect(graph.nodes[1].position).toEqual({ x: -10, y: 900 });
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual(definition);
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

  it('rejects a condition without rules', () => {
    const nodes = [condition('decidir')];
    expect(validateGraph(nodes, [])).toEqual([{ nodeId: 'decidir', message: 'Adicione ao menos uma regra.' }]);
  });

  it('points at the rule that is missing a destination', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [
          { id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' },
          { id: 'regra_2', variavel: 'opcao', operador: '==', valor: '2', destinoId: '' },
        ],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    const edges = [{ id: 'e1', source: 'captura', target: 'decidir' }];
    expect(validateGraph(nodes, edges)).toEqual([
      { nodeId: 'decidir', message: 'Complete a 2ª regra: falta escolher o destino.' },
    ]);
  });

  it('rejects a condition without a default branch', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: '',
      }),
      message('a', 'A'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([
      { nodeId: 'decidir', message: 'Escolha para onde ir quando nenhuma regra for verdadeira.' },
    ]);
  });

  it('rejects a rule whose variable is never captured before the condition', () => {
    const nodes = [
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'cliente.opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [])).toEqual([
      { nodeId: 'decidir', message: 'A variável cliente.opcao não é capturada antes desta condição.' },
    ]);
  });

  it('rejects a value containing quotes', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: 'a"b', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([
      { nodeId: 'decidir', message: 'O valor da 1ª regra não pode conter aspas.' },
    ]);
  });

  it('rejects a rule whose serialized expression is too long', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: 'x'.repeat(300), destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([
      { nodeId: 'decidir', message: 'A 1ª regra é longa demais; reduza o valor.' },
    ]);
  });

  it('accepts a complete condition', () => {
    const nodes = [
      node('captura', { kind: 'capture', variable: 'opcao' }),
      node('decidir', {
        kind: 'condition',
        regras: [{ id: 'regra_1', variavel: 'opcao', operador: '==', valor: '1', destinoId: 'a' }],
        padraoId: 'b',
      }),
      message('a', 'A'),
      message('b', 'B'),
    ];
    expect(validateGraph(nodes, [{ id: 'e1', source: 'captura', target: 'decidir' }])).toEqual([]);
  });

  it('loads an integration node with its two named outputs', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'consultar',
      nos: [
        {
          id: 'consultar',
          tipo: 'integracao_http',
          dados: {
            credencialId: 'cred-1',
            metodo: 'GET',
            url: 'https://api.exemplo.com/pedidos/{{numero}}',
            mapeamentoResposta: { 'pedido.status': '$.dados.status' },
          },
          sucesso: 'achou',
          falha: 'nao_achou',
        },
        { id: 'achou', tipo: 'mensagem', dados: { texto: 'Encontrei' } },
        { id: 'nao_achou', tipo: 'mensagem', dados: { texto: 'Não encontrei' } },
      ],
    });
    expect(graph.nodes[0].data).toMatchObject({
      kind: 'integration',
      credentialId: 'cred-1',
      method: 'GET',
      url: 'https://api.exemplo.com/pedidos/{{numero}}',
      mappings: [{ id: 'mapa_1', variavel: 'pedido.status', caminho: '$.dados.status' }],
    });
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'consultar', sourceHandle: 'sucesso', target: 'achou' }),
        expect.objectContaining({ source: 'consultar', sourceHandle: 'falha', target: 'nao_achou' }),
      ]),
    );
  });

  it('falls back to the GET method when the backend value is not recognized', () => {
    const graph = definitionToGraph({
      schemaVersao: 1,
      noInicial: 'consultar',
      nos: [
        {
          id: 'consultar',
          tipo: 'integracao_http',
          dados: { credencialId: 'cred-1', metodo: 'TRACE', url: 'https://api.exemplo.com', mapeamentoResposta: {} },
        },
      ],
    });
    expect(graph.nodes[0].data.method).toBe('GET');
  });

  it('serializes an integration node from its two named edges', () => {
    const nodes: FlowGraph['nodes'] = [
      node('consultar', {
        kind: 'integration',
        icon: 'integration',
        credentialId: 'cred-1',
        method: 'POST',
        url: 'https://api.exemplo.com/pedidos',
        requestBody: '{"id": "{{numero}}"}',
        mappings: [{ id: 'mapa_1', variavel: 'pedido.status', caminho: '$.status' }],
      }),
      message('ok', 'Ok'),
      message('erro', 'Erro'),
    ];
    const edges = [
      { id: 'e1', source: 'consultar', sourceHandle: 'sucesso', target: 'ok' },
      { id: 'e2', source: 'consultar', sourceHandle: 'falha', target: 'erro' },
    ];
    expect(graphToDefinition(nodes, edges).nos[0]).toEqual({
      id: 'consultar',
      tipo: 'integracao_http',
      dados: {
        credencialId: 'cred-1',
        metodo: 'POST',
        url: 'https://api.exemplo.com/pedidos',
        corpo: '{"id": "{{numero}}"}',
        mapeamentoResposta: { 'pedido.status': '$.status' },
      },
      sucesso: 'ok',
      falha: 'erro',
      posicao: { x: 0, y: 0 },
    });
  });

  it('omits an incomplete response mapping when serializing', () => {
    const nodes: FlowGraph['nodes'] = [
      node('consultar', {
        kind: 'integration',
        credentialId: 'cred-1',
        method: 'GET',
        url: 'https://api.exemplo.com',
        mappings: [
          { id: 'mapa_1', variavel: 'status', caminho: '$.status' },
          { id: 'mapa_2', variavel: '', caminho: '' },
        ],
      }),
    ];
    expect(graphToDefinition(nodes, []).nos[0]).toMatchObject({
      dados: { mapeamentoResposta: { status: '$.status' } },
    });
  });

  it('round-trips an integration node without a request body or mappings', () => {
    const definition = {
      schemaVersao: 1 as const,
      noInicial: 'consultar',
      nos: [
        {
          id: 'consultar',
          tipo: 'integracao_http',
          dados: { credencialId: 'cred-1', metodo: 'DELETE', url: 'https://api.exemplo.com/1', mapeamentoResposta: {} },
        },
      ],
    };
    const graph = definitionToGraph(definition);
    expect(graphToDefinition(graph.nodes, graph.edges)).toEqual({
      ...definition,
      nos: [{ ...definition.nos[0], posicao: { x: 120, y: 60 } }],
    });
  });
});

// Definição real, publicada por este projeto contra a API do backend, do
// fluxo de demonstração "Consulta de CEP (demo integração)". Antes deste
// bloco, kindFromType não reconhecia `integracao_http` e caía no padrão
// `message` — abrir e salvar este fluxo pelo editor apagaria a integração,
// substituindo-a por um bloco de mensagem vazio.
describe('round-trips the real "Consulta de CEP" flow definition unchanged', () => {
  const definicaoReal = {
    schemaVersao: 1 as const,
    noInicial: 'pedir_cep',
    nos: [
      {
        id: 'pedir_cep',
        tipo: 'mensagem',
        dados: { texto: 'Digite seu CEP (só números)' },
        posicao: { x: 300, y: 0 },
        proximo: 'capturar',
      },
      {
        id: 'capturar',
        tipo: 'captura_resposta',
        dados: { variavel: 'cep' },
        posicao: { x: 300, y: 120 },
        proximo: 'consultar',
      },
      {
        id: 'consultar',
        tipo: 'integracao_http',
        dados: {
          url: 'https://viacep.com.br/ws/{{cep}}/json/',
          metodo: 'GET',
          credencialId: 'c2c71248-d38b-40ab-9c48-1757b41eecbd',
          mapeamentoResposta: { 'endereco.uf': '$.uf', 'endereco.cidade': '$.localidade' },
        },
        falha: 'nao_achou',
        posicao: { x: 300, y: 240 },
        sucesso: 'achou',
      },
      {
        id: 'achou',
        tipo: 'mensagem',
        dados: { texto: 'Encontrei: {{endereco.cidade}}/{{endereco.uf}}' },
        posicao: { x: 150, y: 380 },
      },
      {
        id: 'nao_achou',
        tipo: 'mensagem',
        dados: { texto: 'Não consegui consultar esse CEP.' },
        posicao: { x: 450, y: 380 },
      },
    ],
  };

  it('loads the integration node with its real credential, URL and mappings', () => {
    const graph = definitionToGraph(definicaoReal);
    const consultar = graph.nodes.find((node) => node.id === 'consultar');
    expect(consultar?.data).toMatchObject({
      kind: 'integration',
      credentialId: 'c2c71248-d38b-40ab-9c48-1757b41eecbd',
      method: 'GET',
      url: 'https://viacep.com.br/ws/{{cep}}/json/',
    });
    expect(consultar?.data.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variavel: 'endereco.uf', caminho: '$.uf' }),
        expect.objectContaining({ variavel: 'endereco.cidade', caminho: '$.localidade' }),
      ]),
    );
  });

  it('saves back to the exact same definition, byte for byte on the meaningful fields', () => {
    const graph = definitionToGraph(definicaoReal);
    const saved = graphToDefinition(graph.nodes, graph.edges);
    expect(saved).toEqual(definicaoReal);
  });

  it('never downgrades the block to an empty message node', () => {
    const graph = definitionToGraph(definicaoReal);
    const saved = graphToDefinition(graph.nodes, graph.edges);
    const consultar = saved.nos.find((no) => no.id === 'consultar') as { tipo: string; dados: unknown };
    expect(consultar.tipo).toBe('integracao_http');
    expect(consultar.dados).not.toEqual({ texto: '' });
  });
});

describe('integration node validation', () => {
  it('rejects an integration without a selected credential', () => {
    const issues = validateGraph([node('consultar', { kind: 'integration', url: 'https://api.exemplo.com' })], []);
    expect(issues).toEqual([{ nodeId: 'consultar', message: 'Selecione a integração que este bloco vai chamar.' }]);
  });

  it('rejects an integration without a URL', () => {
    const issues = validateGraph([node('consultar', { kind: 'integration', credentialId: 'cred-1', url: '' })], []);
    expect(issues).toEqual([{ nodeId: 'consultar', message: 'Informe a URL da chamada.' }]);
  });

  it('rejects a response mapping with an invalid variable name', () => {
    const nodes = [
      node('consultar', {
        kind: 'integration',
        credentialId: 'cred-1',
        url: 'https://api.exemplo.com',
        mappings: [{ id: 'mapa_1', variavel: '1 invalido', caminho: '$.status' }],
      }),
    ];
    expect(validateGraph(nodes, [])).toEqual([
      { nodeId: 'consultar', message: 'O campo da resposta na posição 1 tem nome de variável inválido.' },
    ]);
  });

  it('rejects a response mapping with an invalid path', () => {
    const nodes = [
      node('consultar', {
        kind: 'integration',
        credentialId: 'cred-1',
        url: 'https://api.exemplo.com',
        mappings: [{ id: 'mapa_1', variavel: 'status', caminho: 'status' }],
      }),
    ];
    expect(validateGraph(nodes, [])).toEqual([
      {
        nodeId: 'consultar',
        message: 'O campo da resposta na posição 1 tem caminho inválido. Use algo como $.dados.status.',
      },
    ]);
  });

  it('accepts an integration with no response mapping at all', () => {
    const nodes = [node('consultar', { kind: 'integration', credentialId: 'cred-1', url: 'https://api.exemplo.com' })];
    expect(validateGraph(nodes, [])).toEqual([]);
  });

  it('accepts a complete response mapping', () => {
    const nodes = [
      node('consultar', {
        kind: 'integration',
        credentialId: 'cred-1',
        url: 'https://api.exemplo.com',
        mappings: [{ id: 'mapa_1', variavel: 'pedido.status', caminho: '$.dados.status' }],
      }),
    ];
    expect(validateGraph(nodes, [])).toEqual([]);
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
