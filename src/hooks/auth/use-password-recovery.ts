'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';

export function usePasswordRecovery() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<void>('/auth/esqueci-senha', {
        method: 'POST',
        auth: false,
        retryAuth: false,
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }),
  });
}
