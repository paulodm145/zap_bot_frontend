'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FlowVersion } from '@/features/flows/types';
import { apiRequest } from '@/lib/api/api-client';
import { flowKeys } from './use-flows';

export function usePublishFlow(flowId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!flowId) throw new Error('Salve o fluxo antes de publicar.');
      return apiRequest<FlowVersion>(`/fluxos/${flowId}/publicar`, { method: 'POST' });
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: flowKeys.all });
    },
  });
}
