'use client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';import { apiRequest } from '@/lib/api/api-client';import type { Conversation,Message,Page } from '@/features/tenant/types';
const keys=['tenant','conversations'] as const;
export function useConversations(view:string){return useQuery({queryKey:[...keys,view],queryFn:({signal})=>apiRequest<Page<Conversation>>(`/conversas?skip=0&take=100&visao=${view}`,{signal}),refetchInterval:15000});}
export function useConversation(id?:string){return useQuery({queryKey:[...keys,'detail',id],queryFn:({signal})=>apiRequest<Conversation>(`/conversas/${id}`,{signal}),enabled:!!id});}
export function useMessages(id?:string){return useQuery({queryKey:[...keys,id,'messages'],queryFn:({signal})=>apiRequest<{dados:Message[];proximoCursor?:string|null}>(`/conversas/${id}/mensagens?take=50`,{signal}),enabled:!!id,refetchInterval:8000});}
function invalidate(c:ReturnType<typeof useQueryClient>,id:string){return Promise.all([c.invalidateQueries({queryKey:keys}),c.invalidateQueries({queryKey:[...keys,id]})]);}
export function useAssumeConversation(){const c=useQueryClient();return useMutation({mutationFn:(id:string)=>apiRequest<Conversation>(`/conversas/${id}/assumir`,{method:'POST'}),onSuccess:(_,id)=>invalidate(c,id)});}
export function useCloseConversation(){const c=useQueryClient();return useMutation({mutationFn:(i:{id:string;reason:string})=>apiRequest<Conversation>(`/conversas/${i.id}/encerrar`,{method:'POST',body:JSON.stringify({motivo:i.reason||undefined,devolverAoBot:false})}),onSuccess:(_,i)=>invalidate(c,i.id)});}
export function useSendMessage(){const c=useQueryClient();return useMutation({mutationFn:(i:{id:string;text:string;key:string})=>apiRequest<Message>(`/conversas/${i.id}/mensagens`,{method:'POST',body:JSON.stringify({tipo:'TEXTO',texto:i.text,chaveIdempotencia:i.key})}),onSuccess:(_,i)=>c.invalidateQueries({queryKey:[...keys,i.id,'messages']})});}
