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
  versoes?: FlowVersion[];
};

export type FlowVersion = { public_id: string; versao: number; definicao: FlowDefinition; created_at: string };

export type FlowRuleOperator = '==' | '!=';

export type FlowRule = {
  /** Chave estável para render e reordenação; não é enviada ao backend. */
  id: string;
  variavel: string;
  operador: FlowRuleOperator;
  valor: string;
  /** Vazio enquanto a regra estiver incompleta. */
  destinoId: string;
};

export type FlowHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type FlowResponseMapping = {
  /** Chave estável para render e reordenação; não é enviada ao backend. */
  id: string;
  variavel: string;
  /** Caminho no formato `$.a.b[0]`, extraído da resposta da chamada. */
  caminho: string;
};

export type FlowNodeData = {
  label: string;
  detail: string;
  kind: string;
  icon: string;
  content: string;
  sectorId?: string;
  /** Nome da variável onde a captura guarda a resposta; exigido pelo backend. */
  variable?: string;
  /** Somente em blocos de condição. */
  regras?: FlowRule[];
  /** Somente em blocos de condição: destino quando nenhuma regra for verdadeira. */
  padraoId?: string;
  /** Somente em blocos de integração HTTP. */
  credentialId?: string;
  method?: FlowHttpMethod;
  url?: string;
  requestBody?: string;
  mappings?: FlowResponseMapping[];
  /** Somente em blocos de integração HTTP: destino em cada saída nomeada. */
  successId?: string;
  failureId?: string;
  validationError?: string;
};
