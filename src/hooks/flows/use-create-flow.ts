'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/api-client';
import type { FlowDetail } from '@/features/flows/types';
import { flowKeys } from './use-flows';

export function useCreateFlow() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (name: string) =>
      apiRequest<FlowDetail>('/fluxos', {
        method: 'POST',
        body: JSON.stringify({
          nome: name,
          definicao: {
            schemaVersao: 1,
            noInicial: 'inicio',
            nos: [{ id: 'inicio', tipo: 'mensagem', dados: { texto: 'Olá! Como posso ajudar?' } }],
          },
        }),
      }),
    async onSuccess(flow) {
      await queryClient.invalidateQueries({ queryKey: flowKeys.all });
      router.push(`/fluxos/${flow.public_id}`);
    },
  });
}
