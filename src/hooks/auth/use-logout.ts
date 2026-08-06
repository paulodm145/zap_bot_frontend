'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/api-client';
import { sessionStore } from '@/lib/auth/session-store';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => sessionStore.getSnapshot().impersonation ? Promise.resolve() : apiRequest<void>('/auth/logout', {
      method: 'POST',
      auth: false,
      retryAuth: false,
      credentials: 'include',
    }),
    onSettled() {
      const wasImpersonating = Boolean(sessionStore.getSnapshot().impersonation);
      sessionStore.clear();
      queryClient.clear();
      router.replace(wasImpersonating ? '/interno/tenants' : '/login');
    },
  });
}
