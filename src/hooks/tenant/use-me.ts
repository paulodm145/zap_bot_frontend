'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/api-client';
import { sessionStore } from '@/lib/auth/session-store';
import type { Me } from '@/features/tenant/types';
export const meKey = ['tenant','me'] as const;
export function useMe(){return useQuery({queryKey:meKey,queryFn:({signal})=>apiRequest<Me>('/me',{signal})});}
export function useUpdateMe(){const c=useQueryClient();return useMutation({mutationFn:(nome:string)=>apiRequest<Me>('/me',{method:'PUT',body:JSON.stringify({nome})}),onSuccess:(me)=>c.setQueryData(meKey,me)});}
export function useChangeOwnPassword(){const r=useRouter(),c=useQueryClient();return useMutation({mutationFn:(i:{currentPassword:string;newPassword:string})=>apiRequest<void>('/me/senha',{method:'PUT',body:JSON.stringify({senhaAtual:i.currentPassword,novaSenha:i.newPassword})}),onSuccess(){sessionStore.clear();c.clear();r.replace('/login');}});}
export function useChangeOwnEmail(){const r=useRouter(),c=useQueryClient();return useMutation({mutationFn:(i:{currentPassword:string;newEmail:string})=>apiRequest<void>('/me/email',{method:'PUT',body:JSON.stringify({senhaAtual:i.currentPassword,novoEmail:i.newEmail})}),onSuccess(){sessionStore.clear();c.clear();r.replace('/login');}});}
