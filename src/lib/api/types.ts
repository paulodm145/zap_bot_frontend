export type ApiErrorBody = {
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: unknown;
  };
};

export type BackendPage<T> = {
  dados: T[];
  total: number;
  skip: number;
  take: number;
};

export type BackendPageParams = {
  skip: number;
  take: number;
  busca?: string;
};
