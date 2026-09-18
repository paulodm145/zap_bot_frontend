'use client';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { IntegrationCredential, Page } from '@/features/tenant/types';

/** Lista só as ativas, no volume que o seletor do editor de fluxo precisa. */
export function useIntegrationCredentials() {
  return useQuery({
    queryKey: ['tenant', 'integrations', 'active'],
    queryFn: ({ signal }) =>
      apiRequest<Page<IntegrationCredential>>('/integracoes?ativo=true&skip=0&take=100', { signal }),
  });
}
