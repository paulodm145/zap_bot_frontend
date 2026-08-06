'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { InternalTenantListParams, InternalTenantSummary } from '@/features/superadmin/types';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import type { BackendPage } from '@/lib/api/types';

export const internalTenantKeys = {
  all: ['superadmin', 'tenants'] as const,
  list: (params: InternalTenantListParams) => ['superadmin', 'tenants', 'list', params] as const,
};

export function useInternalTenants(params: InternalTenantListParams) {
  return useQuery({
    queryKey: internalTenantKeys.list(params),
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({
        skip: String(params.skip),
        take: String(params.take),
        ordenarPor: params.orderBy ?? 'updated_at',
        ordem: params.order ?? 'desc',
      });
      if (params.search?.trim()) query.set('busca', params.search.trim());
      if (params.status) query.set('status', params.status);
      if (params.planId?.trim()) query.set('planoId', params.planId.trim());
      return internalApiRequest<BackendPage<InternalTenantSummary>>(`/interno/tenants?${query}`, { signal });
    },
    placeholderData: keepPreviousData,
  });
}
