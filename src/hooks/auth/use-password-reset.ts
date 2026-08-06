'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';

export function usePasswordReset() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      apiRequest<void>('/auth/redefinir-senha', {
        method: 'POST',
        auth: false,
        retryAuth: false,
        body: JSON.stringify({ token, novaSenha: newPassword }),
      }),
  });
}
