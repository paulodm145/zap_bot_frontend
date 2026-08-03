'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/api-client';
import type { Page } from '@/features/tenant/types';
export type WhatsAppAccount = { public_id:string; nome:string; phone_number_id:string; waba_id:string; numero_exibicao?:string|null; status:'PENDENTE'|'VALIDADA'|'INVALIDA'; ativo:boolean; ultima_validacao_at?:string|null; ultimo_erro_mensagem?:string|null };
const keys = ['tenant','whatsapp'] as const;
export function useWhatsAppAccounts(search='',skip=0,take=20){ return useQuery({queryKey:[...keys,search,skip,take],queryFn:({signal})=>apiRequest<Page<WhatsAppAccount>>(`/contas-whatsapp?skip=${skip}&take=${take}&busca=${encodeURIComponent(search)}`,{signal})}); }
function useAccountAction<T>(fn:(input:T)=>Promise<unknown>){ const client=useQueryClient(); return useMutation({mutationFn:fn,onSuccess:()=>client.invalidateQueries({queryKey:keys})}); }
export function useCreateWhatsApp(){ return useAccountAction((input:{nome:string;phoneNumberId:string;wabaId:string;numeroExibicao:string;versaoGraphApi:string;accessToken:string})=>apiRequest('/contas-whatsapp',{method:'POST',body:JSON.stringify(input)})); }
export function useTestWhatsApp(){ return useAccountAction((id:string)=>apiRequest(`/contas-whatsapp/${id}/testar`,{method:'POST'})); }
export function useWhatsAppStatus(){ return useAccountAction((input:{id:string;ativo:boolean})=>apiRequest(`/contas-whatsapp/${input.id}/status`,{method:'PATCH',body:JSON.stringify({ativo:input.ativo})})); }
