'use client';

import { useQuery } from '@tanstack/react-query';
import { internalApiRequest } from '@/lib/api/internal-api-client';

export function useInternalHealth() {
  return useQuery({
    queryKey: ['superadmin', 'health'],
    queryFn: ({ signal }) => internalApiRequest<Record<string, unknown>>('/interno/saude', { signal }),
    retry: false,
  });
}
