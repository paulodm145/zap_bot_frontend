'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { refreshAccessToken } from '@/lib/api/api-client';
import { useSession } from '@/hooks/auth/use-session';

type ConversationEvent = {
  tenantId: string;
  conversaId: string;
  setorId?: string;
  mensagemId?: string;
  dados?: unknown;
};

type PresenceEvent = {
  usuarioId: string;
  online: boolean;
};

type SessionExpiredEvent = {
  motivo?: string;
};

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  presence: ReadonlyMap<string, boolean>;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  presence: new Map(),
});

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

function socketOrigin() {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL.replace(/\/api\/v1$/, '');
  }
}

function authenticationError(error: Error & { data?: unknown }) {
  const data = error.data as { codigo?: string; code?: string } | undefined;
  return error.message === 'NAO_AUTENTICADO' || data?.codigo === 'NAO_AUTENTICADO' || data?.code === 'NAO_AUTENTICADO';
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<ReadonlyMap<string, boolean>>(new Map());

  useEffect(() => {
    const token = session.accessToken;
    const tenantId = session.user?.tenantId;
    if (!token || !tenantId) return;

    const current = io(socketOrigin(), {
      path: '/socket.io',
      auth: { token },
      withCredentials: !session.impersonation,
      autoConnect: false,
    });
    let refreshAttempted = false;

    const reconcile = () => {
      refreshAttempted = false;
      setSocket(current);
      setConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations'] });
    };
    const disconnected = () => {
      setSocket(null);
      setConnected(false);
    };
    const refreshAndReconnect = async () => {
      if (refreshAttempted || session.impersonation) return;
      refreshAttempted = true;
      current.disconnect();
      try {
        await refreshAccessToken();
      } catch {
        // O cliente HTTP limpa a sessão quando a renovação falha.
      }
    };
    const connectError = (error: Error & { data?: unknown }) => {
      setConnected(false);
      if (authenticationError(error)) void refreshAndReconnect();
    };
    const sessionExpired = (event: SessionExpiredEvent) => {
      if (!event.motivo || event.motivo === 'CREDENCIAL_INVALIDA') void refreshAndReconnect();
    };
    const conversationChanged = (event: ConversationEvent) => {
      if (event.tenantId !== tenantId) return;
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations', 'detail', event.conversaId] });
    };
    // Mensagem nova também muda `ultima_mensagem` na lista e o total das
    // abas (contadores em use-conversations.ts) — não só o detalhe/thread
    // da conversa aberta. Por isso invalida a mesma chave base que
    // `conversationChanged` usa, além das próprias mensagens.
    const messageChanged = (event: ConversationEvent) => {
      if (event.tenantId !== tenantId) return;
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations', event.conversaId, 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'conversations', 'detail', event.conversaId] });
    };
    const presenceChanged = (event: PresenceEvent) => {
      setPresence((previous) => {
        const next = new Map(previous);
        next.set(event.usuarioId, event.online);
        return next;
      });
    };

    current.on('connect', reconcile);
    current.on('disconnect', disconnected);
    current.on('connect_error', connectError);
    current.on('sessao:expirada', sessionExpired);
    current.on('conversa:nova_na_fila', conversationChanged);
    current.on('conversa:assumida', conversationChanged);
    current.on('conversa:atualizada', conversationChanged);
    current.on('conversa:mensagem_recebida', messageChanged);
    current.on('conversa:mensagem_atualizada', messageChanged);
    current.on('atendente:presenca', presenceChanged);
    current.connect();

    return () => {
      current.removeAllListeners();
      current.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [queryClient, session.accessToken, session.impersonation, session.user?.tenantId]);

  const value = useMemo(() => ({ socket, connected, presence }), [connected, presence, socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
