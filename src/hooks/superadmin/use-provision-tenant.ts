'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ProvisionTenantInput } from '@/features/superadmin/types';
import { internalApiRequest } from '@/lib/api/internal-api-client';
import { internalTenantKeys } from './use-internal-tenants';

type ProvisionResponse = { public_id?: string; tenant?: { public_id?: string } };

export function useProvisionTenant() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: ProvisionTenantInput) => internalApiRequest<ProvisionResponse>('/interno/tenants', { method: 'POST', body: JSON.stringify(input) }),
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: internalTenantKeys.all });
      const id = response?.public_id ?? response?.tenant?.public_id;
      router.push(id ? `/interno/tenants/${id}` : '/interno/tenants');
    },
  });
}
