'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';

type InternalLoginResponse = { exigeSegundoFator: boolean; exigeConfiguracao?: boolean; estadoToken?: string; accessToken?: string };

export function useInternalLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => internalApiRequest<InternalLoginResponse>('/interno/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), senha: password }) }, false),
    onSuccess(response) {
      if (!response.exigeSegundoFator && response.accessToken) {
        internalSessionStore.authenticate(response.accessToken);
        router.replace('/interno');
        return;
      }
      if (response.estadoToken) {
        internalSessionStore.startSecondFactor(response.estadoToken, Boolean(response.exigeConfiguracao));
        router.replace('/interno/2fa');
      }
    },
  });
}
