'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { Page, Sector } from '@/features/tenant/types';
export const sectorKeys = { all: ['tenant', 'sectors'] as const };
export function useSectors(search = '', skip = 0, take = 20, activeOnly = false) {
  return useQuery({
    queryKey: [...sectorKeys.all, search, skip, take, activeOnly],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ skip: String(skip), take: String(take) });
      const normalized = search.trim();
      if (normalized) query.set('busca', normalized);
      if (activeOnly) query.set('ativo', 'true');
      return apiRequest<Page<Sector>>(`/setores?${query}`, { signal });
    },
  });
}
export function useSaveSector() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; nome: string; descricao: string }) => {
      const descricao = input.descricao.trim();
      return apiRequest<Sector>(input.id ? `/setores/${input.id}` : '/setores', {
        method: input.id ? 'PUT' : 'POST',
        body: JSON.stringify({ nome: input.nome.trim(), descricao: descricao || null }),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: sectorKeys.all }),
  });
}
export function useDeleteSector() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/setores/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: sectorKeys.all }),
  });
}
