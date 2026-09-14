'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { Conversation, Message, Page } from '@/features/tenant/types';
const keys = ['tenant', 'conversations'] as const;
// 'FILA' e 'MINHAS' mapeiam direto para o parâmetro `visao` da API. 'BOT' e
// 'ENCERRADA' são views só do frontend: a API não tem `visao` para elas, então
// viram `visao=TODAS` combinado com o filtro `status`.
const statusPorView: Record<string, string | undefined> = { BOT: 'BOT', ENCERRADA: 'ENCERRADA' };
// O Socket.IO já invalida estas chaves a cada evento. O polling permanece
// apenas como rede de segurança enquanto o tempo real estiver desconectado.
export function useConversations(view: string, realtime = false) {
  return useQuery({
    queryKey: [...keys, view],
    queryFn: ({ signal }) => {
      const status = statusPorView[view];
      const query = new URLSearchParams({ skip: '0', take: '100', visao: status ? 'TODAS' : view });
      if (status) query.set('status', status);
      return apiRequest<Page<Conversation>>(`/conversas?${query}`, { signal });
    },
    refetchInterval: realtime ? false : 15000,
  });
}
export function useConversation(id?: string) {
  return useQuery({
    queryKey: [...keys, 'detail', id],
    queryFn: ({ signal }) => apiRequest<Conversation>(`/conversas/${id}`, { signal }),
    enabled: !!id,
  });
}
export function useMessages(id?: string, realtime = false) {
  return useQuery({
    queryKey: [...keys, id, 'messages'],
    queryFn: ({ signal }) =>
      apiRequest<{ dados: Message[]; proximoCursor?: string | null }>(`/conversas/${id}/mensagens?take=50`, { signal }),
    enabled: !!id,
    refetchInterval: realtime ? false : 8000,
  });
}
function invalidate(c: ReturnType<typeof useQueryClient>, id: string) {
  return Promise.all([c.invalidateQueries({ queryKey: keys }), c.invalidateQueries({ queryKey: [...keys, id] })]);
}
export function useAssumeConversation() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Conversation>(`/conversas/${id}/assumir`, { method: 'POST' }),
    onSuccess: (_, id) => invalidate(c, id),
  });
}
export function useCloseConversation() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; reason: string }) =>
      apiRequest<Conversation>(`/conversas/${i.id}/encerrar`, {
        method: 'POST',
        body: JSON.stringify({ motivo: i.reason || undefined, devolverAoBot: false }),
      }),
    onSuccess: (_, i) => invalidate(c, i.id),
  });
}
export function useReassignConversation() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; setorId: string; reason: string }) =>
      apiRequest<Conversation>(`/conversas/${i.id}/reatribuir`, {
        method: 'POST',
        body: JSON.stringify({ setorId: i.setorId, motivo: i.reason }),
      }),
    onSuccess: (_, i) => invalidate(c, i.id),
  });
}
export function useSendMessage() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; text: string; key: string }) =>
      apiRequest<Message>(`/conversas/${i.id}/mensagens`, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'TEXTO', texto: i.text, chaveIdempotencia: i.key }),
      }),
    onSuccess: (_, i) => c.invalidateQueries({ queryKey: [...keys, i.id, 'messages'] }),
  });
}
