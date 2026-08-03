'use client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';import { apiRequest } from '@/lib/api/api-client';import type { Page,Sector } from '@/features/tenant/types';
export const sectorKeys={all:['tenant','sectors'] as const};
export function useSectors(search=''){return useQuery({queryKey:[...sectorKeys.all,search],queryFn:({signal})=>apiRequest<Page<Sector>>(`/setores?skip=0&take=100&busca=${encodeURIComponent(search)}`,{signal})});}
export function useSaveSector(){const c=useQueryClient();return useMutation({mutationFn:(i:{id?:string;nome:string;descricao:string})=>apiRequest<Sector>(i.id?`/setores/${i.id}`:'/setores',{method:i.id?'PUT':'POST',body:JSON.stringify({nome:i.nome,descricao:i.descricao||null})}),onSuccess:()=>c.invalidateQueries({queryKey:sectorKeys.all})});}
export function useDeleteSector(){const c=useQueryClient();return useMutation({mutationFn:(id:string)=>apiRequest<void>(`/setores/${id}`,{method:'DELETE'}),onSuccess:()=>c.invalidateQueries({queryKey:sectorKeys.all})});}
