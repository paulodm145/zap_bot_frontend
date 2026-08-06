'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';

export type FlowBlockType = 'mensagem' | 'captura_resposta' | 'condicao' | 'direcionar_setor';

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
};

export type FlowBlockCatalog = {
  schemaVersao: 1;
  blocos: FlowBlockCatalogItem[];
};

export function useFlowBlockCatalog() {
  return useQuery({
    queryKey: ['flows', 'block-catalog'],
    queryFn: ({ signal }) => apiRequest<FlowBlockCatalog>('/fluxos/blocos', { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
