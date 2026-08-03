'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';

export function useConfigureInternalTotp() {
  return useMutation({
    mutationFn: (stateToken: string) => internalApiRequest<{ segredo: string; qrCode: string }>('/interno/auth/2fa/configurar', { method: 'POST', body: JSON.stringify({ estadoToken: stateToken }) }, false),
  });
}

export function useVerifyInternalTotp() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ stateToken, code }: { stateToken: string; code: string }) => internalApiRequest<{ accessToken: string }>('/interno/auth/2fa/verificar', { method: 'POST', body: JSON.stringify({ estadoToken: stateToken, codigo: code }) }, false),
    onSuccess(response) {
      internalSessionStore.authenticate(response.accessToken);
      router.replace('/interno');
    },
  });
}
