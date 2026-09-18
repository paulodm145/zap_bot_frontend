import type { FlowHttpMethod, FlowRuleOperator } from './types';

export type FlowBlockType = 'mensagem' | 'captura_resposta' | 'condicao' | 'direcionar_setor' | 'integracao_http';

export type FlowBlockFieldType =
  | 'texto_curto'
  | 'texto_longo'
  | 'variavel'
  | 'lista_condicoes'
  | 'referencia_no'
  | 'seletor_setor'
  | 'selecao'
  | 'seletor_credencial'
  | 'mapa_extracao';

/** Espelha `METODOS_INTEGRACAO_HTTP` do backend. */
export const METODOS_HTTP: FlowHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export type FlowBlockField = {
  caminho: string;
  rotulo: string;
  descricao: string;
  tipo: FlowBlockFieldType;
  obrigatorio: boolean;
  validacao?: {
    minimoCaracteres?: number;
    maximoCaracteres?: number;
    minimoItens?: number;
    maximoItens?: number;
    padrao?: string;
  };
};

export type FlowBlockConnections = {
  aceitaEntrada: boolean;
  saidas: Array<{
    chave: string;
    rotulo: string;
    tipo: 'unica' | 'dinamica';
    obrigatoria: boolean;
    quantidadeMaxima?: number;
  }>;
};

export type FlowConditionLanguage = { operadores: FlowRuleOperator[]; formato: string; exemplo: string };

export type FlowGraphLimits = { maximoBlocos: number; ciclosPermitidos: boolean; padraoIdentificador: string };

export type FlowBlockCatalogItem = {
  tipo: FlowBlockType;
  nome: string;
  descricao: string;
  icone: string;
  comportamento: {
    pausaExecucao: boolean;
    produzSaida: boolean;
    podeFinalizarFluxo: boolean;
  };
  configuracaoInicial: Record<string, unknown>;
  campos: FlowBlockField[];
  conexoes: FlowBlockConnections;
};

export type FlowBlockCatalog = {
  schemaVersao: 1;
  linguagemCondicao: FlowConditionLanguage;
  restricoesGrafo: FlowGraphLimits;
  blocos: FlowBlockCatalogItem[];
};

/** Limite declarado em `dados.regras` do bloco de condição; 20 é o valor atual do backend. */
export function limiteDeRegras(catalog?: FlowBlockCatalog): number {
  const campo = catalog?.blocos
    .find((bloco) => bloco.tipo === 'condicao')
    ?.campos.find((item) => item.caminho === 'dados.regras');
  return campo?.validacao?.maximoItens ?? 20;
}

/** Limite declarado em `dados.mapeamentoResposta` do bloco de integração; 20 é o valor atual do backend. */
export function limiteDeMapeamentos(catalog?: FlowBlockCatalog): number {
  const campo = catalog?.blocos
    .find((bloco) => bloco.tipo === 'integracao_http')
    ?.campos.find((item) => item.caminho === 'dados.mapeamentoResposta');
  return campo?.validacao?.maximoItens ?? 20;
}
