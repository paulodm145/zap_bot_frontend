'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { Page, Role, TenantUser } from '@/features/tenant/types';
const keys = ['tenant', 'users'] as const;
export function useUsers(search = '', skip = 0, take = 20) {
  return useQuery({
    queryKey: [...keys, search, skip, take],
    queryFn: ({ signal }) =>
      apiRequest<Page<TenantUser>>(`/usuarios?skip=${skip}&take=${take}&busca=${encodeURIComponent(search)}`, {
        signal,
      }),
  });
}
export function useCreateUser() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { nome: string; email: string; senha: string; papel: Role }) =>
      apiRequest<TenantUser>('/usuarios', { method: 'POST', body: JSON.stringify(i) }),
    onSuccess: () => c.invalidateQueries({ queryKey: keys }),
  });
}
export function useUpdateUser() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; nome: string; email: string; papel: Role }) =>
      apiRequest<TenantUser>(`/usuarios/${i.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: i.nome.trim(), email: i.email.trim().toLowerCase(), papel: i.papel }),
      }),
    onSuccess: () => c.invalidateQueries({ queryKey: keys }),
  });
}
export function useUserStatus() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; ativo: boolean }) =>
      apiRequest<TenantUser>(`/usuarios/${i.id}/status`, { method: 'PATCH', body: JSON.stringify({ ativo: i.ativo }) }),
    onSuccess: () => c.invalidateQueries({ queryKey: keys }),
  });
}
export function useDeleteUser() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/usuarios/${id}`, { method: 'DELETE' }),
    onSuccess: () => c.invalidateQueries({ queryKey: keys }),
  });
}
export function useSetUserSectors() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; sectorIds: string[] }) =>
      apiRequest<void>(`/usuarios/${i.id}/setores`, {
        method: 'PUT',
        body: JSON.stringify({ setoresIds: i.sectorIds }),
      }),
    onSuccess: () => c.invalidateQueries({ queryKey: keys }),
  });
}
