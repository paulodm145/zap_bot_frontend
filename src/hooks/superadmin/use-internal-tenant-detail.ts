'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InternalTenantDetailResponse, TenantStatus } from '@/features/superadmin/types';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import { internalTenantKeys } from './use-internal-tenants';

const detailKey = (tenantId: string) => [...internalTenantKeys.all, 'detail', tenantId] as const;

export function useInternalTenantDetail(tenantId: string) {
  return useQuery({ queryKey: detailKey(tenantId), queryFn: ({ signal }) => internalApiRequest<InternalTenantDetailResponse>(`/interno/tenants/${encodeURIComponent(tenantId)}`, { signal }) });
}

function useInvalidateTenant(tenantId: string) {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: internalTenantKeys.all }), queryClient.invalidateQueries({ queryKey: detailKey(tenantId) })]);
}

export function useChangeTenantStatus(tenantId: string) {
  const invalidate = useInvalidateTenant(tenantId);
  return useMutation({
    mutationFn: ({ status, reason }: { status: Extract<TenantStatus, 'ATIVO' | 'SUSPENSO' | 'CANCELADO'>; reason: string }) => internalApiRequest<unknown>(`/interno/tenants/${encodeURIComponent(tenantId)}/status`, { method: 'PATCH', body: JSON.stringify({ status, confirmar: true, motivo: reason }) }),
    onSuccess: invalidate,
  });
}

export function useChangeTenantPlan(tenantId: string) {
  const invalidate = useInvalidateTenant(tenantId);
  return useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason: string }) => internalApiRequest<unknown>(`/interno/tenants/${encodeURIComponent(tenantId)}/plano`, { method: 'PATCH', body: JSON.stringify({ planoId: planId, confirmar: true, motivo: reason }) }),
    onSuccess: invalidate,
  });
}
