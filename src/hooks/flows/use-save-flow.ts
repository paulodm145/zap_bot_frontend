'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FlowDefinition, FlowDetail } from '@/features/flows/types';
import { apiRequest } from '@/lib/api/api-client';
import { flowKeys } from './use-flows';

export function useSaveFlow(flowId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, definition }: { name: string; definition: FlowDefinition }) => {
      if (!flowId) throw new Error('Fluxo sem identificador para salvamento remoto.');
      return apiRequest<FlowDetail>(`/fluxos/${flowId}`, { method: 'PUT', body: JSON.stringify({ nome: name, definicao: definition }) });
    },
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flowKeys.all }),
        queryClient.invalidateQueries({ queryKey: [...flowKeys.all, 'detail', flowId] }),
      ]);
    },
  });
}
