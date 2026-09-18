'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { SocketProvider } from '@/lib/realtime/socket-provider';
import { isApiError } from '@/lib/api/api-error';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Toast automático em qualquer mutação (POST/PUT/DELETE) que falhar —
        // uma ação que o usuário disparou e que não deu certo sempre precisa
        // de um aviso visível, mesmo em telas sem tratamento de erro próprio.
        // Consultas (GET) que fazem polling em segundo plano ficam de fora de
        // propósito: uma falha transitória ali não deve interromper o usuário
        // com um toast a cada nova tentativa automática.
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(isApiError(error) ? error.message : 'Não foi possível concluir a ação.');
          },
        }),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
      <ToastContainer />
    </QueryClientProvider>
  );
}
