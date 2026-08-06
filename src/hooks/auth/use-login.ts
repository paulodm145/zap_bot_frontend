'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/api-client';
import { sessionStore, type SessionUser } from '@/lib/auth/session-store';

type LoginInput = { email: string; senha: string };
type LoginResponse = { accessToken: string; usuario: SessionUser };

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        retryAuth: false,
        credentials: 'include',
        body: JSON.stringify({ email: input.email.trim().toLowerCase(), senha: input.senha }),
      }),
    onSuccess(response) {
      sessionStore.authenticate(response.accessToken, response.usuario);
      router.replace('/dashboard');
    },
  });
}
