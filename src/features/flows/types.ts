export type FlowStatusFilter = 'RASCUNHO' | 'PUBLICADO';

export type FlowSummary = {
  public_id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  possui_alteracoes_nao_publicadas: boolean;
  publicado_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FlowDefinition = {
  schemaVersao: 1;
  noInicial: string;
  nos: Array<Record<string, unknown>>;
};

export type FlowDetail = FlowSummary & {
  definicao: FlowDefinition;
};
