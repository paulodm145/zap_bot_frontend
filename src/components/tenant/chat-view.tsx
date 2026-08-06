'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { useConversationSocket } from '@/hooks/tenant/use-conversation-socket';
import { useAssumeConversation, useCloseConversation, useConversation, useConversations, useMessages, useSendMessage } from '@/hooks/tenant/use-conversations';
import { isApiError } from '@/lib/api/api-error';
import styles from './chat-view.module.css';

type PendingSend = { conversationId: string; text: string; key: string };

export function ChatView() {
  const [view, setView] = useState('FILA');
  const [selected, setSelected] = useState<string>();
  const [text, setText] = useState('');
  const pendingSend = useRef<PendingSend | undefined>(undefined);
  const list = useConversations(view);
  const detail = useConversation(selected);
  const messages = useMessages(selected);
  const assume = useAssumeConversation();
  const close = useCloseConversation();
  const send = useSendMessage();
  const realtime = useConversationSocket(selected);
  const conversation = realtime.authorized ? detail.data ?? list.data?.dados.find((item) => item.public_id === selected) : undefined;
  const responsibleOnline = conversation?.atendente ? realtime.presence.get(conversation.atendente.public_id) : undefined;

  function submit() {
    if (!selected || !text.trim()) return;
    const normalized = text.trim();
    const previous = pendingSend.current;
    const attempt = previous?.conversationId === selected && previous.text === normalized
      ? previous
      : { conversationId: selected, text: normalized, key: crypto.randomUUID() };
    pendingSend.current = attempt;
    send.mutate({ id: selected, text: normalized, key: attempt.key }, {
      onSuccess: () => {
        pendingSend.current = undefined;
        setText('');
      },
    });
  }

  const error = list.error ?? detail.error ?? messages.error ?? send.error;
  return <AppShell title="Atendimento" subtitle={`Fila e conversas em andamento · ${realtime.connected ? 'tempo real conectado' : 'reconectando...'}`}>
    <div className={styles.workspace}>
      <aside className={styles.list}>
        <div className={styles.tabs}><button onClick={() => setView('FILA')}>Fila</button><button onClick={() => setView('MINHAS')}>Minhas</button><button onClick={() => setView('ENCERRADA')}>Encerradas</button></div>
        {list.data?.dados.map((item) => <button className={`${styles.item} ${selected === item.public_id ? styles.active : ''}`} key={item.public_id} onClick={() => setSelected(item.public_id)}><strong>{item.contato.nome ?? item.contato.telefone}</strong><span>{item.ultima_mensagem ?? 'Sem mensagem'}</span><small>{item.setor?.nome ?? item.status}</small></button>)}
      </aside>
      {conversation ? <section className={styles.chat}>
        <header className={styles.header}><div><strong>{conversation.contato.nome ?? conversation.contato.telefone}</strong><small>{conversation.status} · {conversation.setor?.nome ?? 'Sem setor'}{responsibleOnline !== undefined ? ` · ${responsibleOnline ? 'responsável online' : 'responsável offline'}` : ''}</small></div>{conversation.status === 'AGUARDANDO_ATENDENTE' && <Button onClick={() => assume.mutate(conversation.public_id)}>Assumir</Button>}{conversation.status === 'COM_ATENDENTE' && <Button variant="secondary" onClick={() => close.mutate({ id: conversation.public_id, reason: 'Encerrado pelo atendimento' })}>Encerrar</Button>}</header>
        <div className={styles.messages}>{messages.data?.dados.map((message) => <div className={`${styles.bubble} ${message.direcao === 'SAIDA' ? styles.out : ''}`} key={message.public_id}>{message.texto ?? message.conteudo ?? message.tipo}<small>{message.status ?? message.created_at}</small></div>)}</div>
        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); submit(); }}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Digite uma mensagem" disabled={conversation.status !== 'COM_ATENDENTE'} /><Button disabled={!text.trim() || send.isPending || conversation.status !== 'COM_ATENDENTE'}>Enviar</Button></form>
      </section> : <div className={styles.empty}>Selecione uma conversa</div>}
    </div>
    {!realtime.authorized && <p role="alert">Você não tem mais acesso a essa conversa. A lista foi atualizada.</p>}
    {error && <p>{isApiError(error) ? error.message : 'Falha no atendimento.'}</p>}
  </AppShell>;
}
