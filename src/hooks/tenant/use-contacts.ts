'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { apiRequest } from '@/lib/api/api-client';
import type { Contact, Page } from '@/features/tenant/types';
export const contactKeys = { all: ['tenant', 'contacts'] as const };
export function useContacts(search = '', skip = 0, take = 20, enabled = true) {
  return useQuery({
    queryKey: [...contactKeys.all, search, skip, take],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ skip: String(skip), take: String(take) });
      const normalized = search.trim();
      if (normalized) query.set('busca', normalized);
      return apiRequest<Page<Contact>>(`/contatos?${query}`, { signal });
    },
    enabled,
  });
}
export function useSaveContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; nome: string; telefone: string }) => {
      const nome = input.nome.trim();
      return apiRequest<Contact>(input.id ? `/contatos/${input.id}` : '/contatos', {
        method: input.id ? 'PUT' : 'POST',
        body: JSON.stringify({ nome: nome || null, telefone: input.telefone.trim() }),
      });
    },
    onSuccess: (_, input) => {
      void client.invalidateQueries({ queryKey: contactKeys.all });
      toast.success(input.id ? 'Contato atualizado.' : 'Contato criado.');
    },
  });
}
export function useDeleteContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/contatos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: contactKeys.all });
      toast.success('Contato excluído.');
    },
  });
}
/** Abre (ou reivindica) a conversa direta do contato; não envia mensagem — só devolve o id para abrir o chat. */
export function useStartConversation() {
  return useMutation({
    mutationFn: (input: { contactId: string; contaWhatsappId?: string }) =>
      apiRequest<{ conversaId: string; status: string; janelaAberta: boolean }>(
        `/contatos/${input.contactId}/conversas`,
        { method: 'POST', body: JSON.stringify({ contaWhatsappId: input.contaWhatsappId }) },
      ),
    onSuccess: (resultado) => {
      if (!resultado.janelaAberta)
        toast.warning('Conversa aberta, mas a janela de atendimento de 24h do WhatsApp está fechada.');
    },
  });
}
