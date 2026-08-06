'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import { sessionStore, type SessionUser } from '@/lib/auth/session-store';

type ImpersonationResponse = {
  accessToken: string;
  usuario: { public_id?: string; id?: string; nome: string; email: string; tenant_id?: string };
  tenant?: { public_id?: string; nome?: string };
  impersonacao: { sessaoId: string; expiraEmSegundos: number };
};

export function useImpersonateTenant(tenantId: string, tenantName: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      internalApiRequest<ImpersonationResponse>(`/interno/tenants/${encodeURIComponent(tenantId)}/impersonar`, {
        method: 'POST',
      }),
    onSuccess(response) {
      const user: SessionUser = {
        id: response.usuario.public_id ?? response.usuario.id ?? '',
        nome: response.usuario.nome,
        email: response.usuario.email,
        tenantId: response.usuario.tenant_id ?? response.tenant?.public_id ?? tenantId,
      };
      sessionStore.impersonate(response.accessToken, user, {
        tenantName: response.tenant?.nome ?? tenantName,
        sessionId: response.impersonacao.sessaoId,
        expiresInSeconds: response.impersonacao.expiraEmSegundos,
      });
      queryClient.clear();
      router.push('/dashboard');
    },
  });
}
