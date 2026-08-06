'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { BackendPage } from '@/lib/api/types';
import type { FlowStatusFilter, FlowSummary } from '@/features/flows/types';

export type FlowListParams = { skip: number; take: number; search?: string; status?: FlowStatusFilter };
export const flowKeys = {
  all: ['flows'] as const,
  list: (params: FlowListParams) => ['flows', 'list', params] as const,
};

export function useFlows(params: FlowListParams) {
  return useQuery({
    queryKey: flowKeys.list(params),
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ skip: String(params.skip), take: String(params.take) });
      if (params.search?.trim()) query.set('busca', params.search.trim());
      if (params.status) query.set('estado', params.status);
      return apiRequest<BackendPage<FlowSummary>>(`/fluxos?${query}`, { signal });
    },
    placeholderData: keepPreviousData,
  });
}
