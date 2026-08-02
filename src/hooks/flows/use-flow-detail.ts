'use client';

import { useQuery } from '@tanstack/react-query';
import type { FlowDetail } from '@/features/flows/types';
import { apiRequest } from '@/lib/api/api-client';
import { flowKeys } from './use-flows';

export function useFlowDetail(flowId?: string) {
  return useQuery({
    queryKey: [...flowKeys.all, 'detail', flowId],
    queryFn: ({ signal }) => apiRequest<FlowDetail>(`/fluxos/${flowId}`, { signal }),
    enabled: Boolean(flowId),
  });
}
