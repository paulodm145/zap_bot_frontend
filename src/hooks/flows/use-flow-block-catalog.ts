'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import { limiteDeRegras } from '@/features/flows/flow-catalog';
import type {
  FlowBlockCatalog,
  FlowBlockCatalogItem,
  FlowBlockConnections,
  FlowBlockField,
  FlowBlockFieldType,
  FlowBlockType,
  FlowConditionLanguage,
  FlowGraphLimits,
} from '@/features/flows/flow-catalog';

// Reexport for backward compatibility
export type {
  FlowBlockCatalog,
  FlowBlockCatalogItem,
  FlowBlockConnections,
  FlowBlockField,
  FlowBlockFieldType,
  FlowBlockType,
  FlowConditionLanguage,
  FlowGraphLimits,
};
export { limiteDeRegras };

export function useFlowBlockCatalog() {
  return useQuery({
    queryKey: ['flows', 'block-catalog'],
    queryFn: ({ signal }) => apiRequest<FlowBlockCatalog>('/fluxos/blocos', { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
