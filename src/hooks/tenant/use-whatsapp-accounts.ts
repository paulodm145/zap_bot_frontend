'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { Page, WhatsAppAccount } from '@/features/tenant/types';

export type { WhatsAppAccount } from '@/features/tenant/types';
export type WhatsAppQrResult = { conta: WhatsAppAccount; qrCodeBase64?: string };

export const whatsappKeys = { all: ['tenant', 'whatsapp'] as const };

export function useWhatsAppAccounts(search = '', skip = 0, take = 20) {
  return useQuery({
    queryKey: [...whatsappKeys.all, search, skip, take],
    queryFn: ({ signal }) =>
      apiRequest<Page<WhatsAppAccount>>(
        `/contas-whatsapp?skip=${skip}&take=${take}&busca=${encodeURIComponent(search)}`,
        { signal },
      ),
  });
}

/** Consulta o detalhe de uma conta e faz polling enquanto ela aguarda pareamento. */
export function useWhatsAppAccount(id: string | null) {
  return useQuery({
    queryKey: [...whatsappKeys.all, 'detail', id],
    queryFn: ({ signal }) => apiRequest<WhatsAppAccount>(`/contas-whatsapp/${id}`, { signal }),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data?.status === 'CONECTANDO' ? 3000 : false),
  });
}

function useAccountAction<T, R = unknown>(fn: (input: T) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: whatsappKeys.all }),
  });
}

export function useCreateWhatsApp() {
  return useAccountAction<{ nome: string; fluxoPublicoId?: string }, WhatsAppQrResult>((input) =>
    apiRequest<WhatsAppQrResult>('/contas-whatsapp', {
      method: 'POST',
      body: JSON.stringify({ nome: input.nome, ...(input.fluxoPublicoId ? { fluxoPublicoId: input.fluxoPublicoId } : {}) }),
    }),
  );
}

export function useReconnectWhatsApp() {
  return useAccountAction<string, WhatsAppQrResult>((id) =>
    apiRequest<WhatsAppQrResult>(`/contas-whatsapp/${id}/reconectar`, { method: 'POST' }),
  );
}

export function useDisconnectWhatsApp() {
  return useAccountAction<string, WhatsAppAccount>((id) =>
    apiRequest<WhatsAppAccount>(`/contas-whatsapp/${id}/desconectar`, { method: 'POST' }),
  );
}

export function useWhatsAppStatus() {
  return useAccountAction((input: { id: string; ativo: boolean }) =>
    apiRequest(`/contas-whatsapp/${input.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: input.ativo }),
    }),
  );
}
