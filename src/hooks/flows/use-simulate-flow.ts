'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';

export type SimulationOutput = {
  tipo: 'mensagem' | 'captura' | 'direcionamento';
  texto?: string;
  mensagem?: string;
  setorId?: string;
};
export type SimulationResponse = { saidas: SimulationOutput[]; estado: Record<string, unknown> };

export function useSimulateFlow(flowId?: string) {
  return useMutation({
    mutationFn: ({ message, state }: { message?: string; state?: Record<string, unknown> } = {}) => {
      if (!flowId) throw new Error('Publique o fluxo antes de simular.');
      return apiRequest<SimulationResponse>(`/fluxos/${flowId}/simular`, {
        method: 'POST',
        body: JSON.stringify({
          ...(message ? { mensagem: message } : {}),
          ...(state ? { estado: state } : {}),
          maxPassos: 50,
        }),
      });
    },
  });
}
