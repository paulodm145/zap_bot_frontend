'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
export type Company = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  site?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
};
export type CepResult = { cep: string; uf: string; municipio: string; bairro: string; logradouro: string };
const key = ['tenant', 'company'] as const;
export function useCompany() {
  return useQuery({ queryKey: key, queryFn: ({ signal }) => apiRequest<Company | null>('/empresa', { signal }) });
}
export function useSaveCompany() {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      apiRequest<Company>('/empresa', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (d) => c.setQueryData(key, d),
  });
}
export function useCep(cep: string) {
  const digits = cep.replace(/\D/g, '');
  return useQuery({
    queryKey: [...key, 'cep', digits],
    queryFn: ({ signal }) => apiRequest<CepResult>(`/empresa/consultar-cep/${digits}`, { signal }),
    enabled: digits.length === 8,
    retry: false,
  });
}
