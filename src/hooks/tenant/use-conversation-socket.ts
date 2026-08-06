'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/realtime/socket-provider';

type JoinResponse = { ok: boolean };

export function useConversationSocket(conversationId?: string) {
  const { socket, connected, presence } = useSocket();
  const queryClient = useQueryClient();
  const [deniedConversationId, setDeniedConversationId] = useState<string>();

  useEffect(() => {
    if (!socket || !connected || !conversationId) return;
    socket.emit('conversa:entrar', conversationId, (response: JoinResponse) => {
      if (response?.ok) {
        setDeniedConversationId((current) => (current === conversationId ? undefined : current));
        return;
      }
      setDeniedConversationId(conversationId);
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations'] });
    });
  }, [connected, conversationId, queryClient, socket]);

  // Sem conversa selecionada não há acesso a negar: comparar dois `undefined`
  // marcava a tela como não autorizada antes de qualquer interação.
  const authorized = conversationId === undefined || deniedConversationId !== conversationId;
  return { connected, authorized, presence };
}
