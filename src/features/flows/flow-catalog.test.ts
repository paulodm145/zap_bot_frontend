import { describe, expect, it } from 'vitest';
import { limiteDeRegras } from './flow-catalog';
import type { FlowBlockCatalog } from './flow-catalog';

describe('limiteDeRegras', () => {
  const catalog = (patch: Partial<FlowBlockCatalog> = {}): FlowBlockCatalog => ({
    schemaVersao: 1,
    linguagemCondicao: {
      operadores: ['==', '!='],
      formato: 'variavel operador "valor"',
      exemplo: 'cliente.opcao == "1"',
    },
    restricoesGrafo: {
      maximoBlocos: 500,
      ciclosPermitidos: false,
      padraoIdentificador: '^[A-Za-z][A-Za-z0-9_-]{0,63}$',
    },
    blocos: [
      {
        tipo: 'condicao',
        nome: 'Condição',
        descricao: 'Divide o fluxo em ramificações',
        icone: 'fork',
        comportamento: {
          pausaExecucao: true,
          produzSaida: true,
          podeFinalizarFluxo: false,
        },
        configuracaoInicial: {},
        campos: [
          {
            caminho: 'dados.regras',
            rotulo: 'Regras',
            descricao: 'Lista de regras condicionais',
            tipo: 'lista_condicoes',
            obrigatorio: true,
            validacao: {
              minimoItens: 1,
              maximoItens: 20,
            },
          },
        ],
        conexoes: {
          aceitaEntrada: true,
          saidas: [
            { chave: 'condicao', rotulo: 'Condição Verdadeira', tipo: 'dinamica', obrigatoria: true },
            { chave: 'padrao', rotulo: 'Padrão', tipo: 'unica', obrigatoria: true },
          ],
        },
      },
    ],
    ...patch,
  });

  it('returns the maximoItens when the condition block and field are present', () => {
    expect(limiteDeRegras(catalog())).toBe(20);
  });

  it('returns 20 when catalog is undefined', () => {
    expect(limiteDeRegras(undefined)).toBe(20);
  });

  it('returns 20 when the condition block is absent', () => {
    expect(limiteDeRegras(catalog({ blocos: [] }))).toBe(20);
  });

  it('returns 20 when the dados.regras field is absent from the condition block', () => {
    expect(
      limiteDeRegras(
        catalog({
          blocos: [
            {
              tipo: 'condicao',
              nome: 'Condição',
              descricao: 'Divide o fluxo em ramificações',
              icone: 'fork',
              comportamento: {
                pausaExecucao: true,
                produzSaida: true,
                podeFinalizarFluxo: false,
              },
              configuracaoInicial: {},
              campos: [],
              conexoes: {
                aceitaEntrada: true,
                saidas: [],
              },
            },
          ],
        }),
      ),
    ).toBe(20);
  });

  it('returns the custom maximoItens from backend', () => {
    expect(
      limiteDeRegras(
        catalog({
          blocos: [
            {
              tipo: 'condicao',
              nome: 'Condição',
              descricao: 'Divide o fluxo em ramificações',
              icone: 'fork',
              comportamento: {
                pausaExecucao: true,
                produzSaida: true,
                podeFinalizarFluxo: false,
              },
              configuracaoInicial: {},
              campos: [
                {
                  caminho: 'dados.regras',
                  rotulo: 'Regras',
                  descricao: 'Lista de regras condicionais',
                  tipo: 'lista_condicoes',
                  obrigatorio: true,
                  validacao: {
                    minimoItens: 1,
                    maximoItens: 50,
                  },
                },
              ],
              conexoes: {
                aceitaEntrada: true,
                saidas: [],
              },
            },
          ],
        }),
      ),
    ).toBe(50);
  });
});

describe('limiteDeRegras reexport via hook', () => {
  it('is available and callable when imported through the hook reexport path', async () => {
    // Dynamic import to test the actual reexport, not just type-checking
    const hookModule = await import('@/hooks/flows/use-flow-block-catalog');
    expect(typeof hookModule.limiteDeRegras).toBe('function');
  });

  it('returns the correct value when called through the hook reexport path', async () => {
    const hookModule = await import('@/hooks/flows/use-flow-block-catalog');
    expect(hookModule.limiteDeRegras()).toBe(20);
  });
});
