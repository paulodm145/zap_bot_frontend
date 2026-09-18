'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { useConversationSocket } from '@/hooks/tenant/use-conversation-socket';
import {
  useAssumeConversation,
  useCloseConversation,
  useConversation,
  useConversationCounts,
  useConversations,
  useMessages,
  useReassignConversation,
  useSendMessage,
} from '@/hooks/tenant/use-conversations';
import { useMe } from '@/hooks/tenant/use-me';
import { useSectors } from '@/hooks/tenant/use-sectors';
import { messageBodyText, messageTimestampLabel } from '@/features/tenant/messages';
import { isApiError } from '@/lib/api/api-error';
import { CrudModal } from './crud-modal';
import tenantStyles from './tenant.module.css';
import styles from './chat-view.module.css';

type PendingSend = { conversationId: string; text: string; key: string };
type Role = 'ADMIN_TENANT' | 'GESTOR' | 'ATENDENTE';

const views: Array<{ value: string; label: string; roles?: Role[] }> = [
  { value: 'FILA', label: 'Fila' },
  { value: 'MINHAS', label: 'Minhas' },
  { value: 'BOT', label: 'Sem atendimento', roles: ['ADMIN_TENANT', 'GESTOR'] },
  { value: 'ENCERRADA', label: 'Encerradas' },
];

export function ChatView() {
  const [view, setView] = useState('FILA');
  const [selected, setSelected] = useState<string>();
  const [text, setText] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignSector, setReassignSector] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const pendingSend = useRef<PendingSend | undefined>(undefined);
  const me = useMe();
  const canManage = me.data?.papel === 'ADMIN_TENANT' || me.data?.papel === 'GESTOR';
  const availableViews = views.filter((item) => !item.roles || (me.data && item.roles.includes(me.data.papel)));
  const realtime = useConversationSocket(selected);
  const list = useConversations(view, realtime.connected);
  const counts = useConversationCounts(realtime.connected);
  const detail = useConversation(selected);
  const messages = useMessages(selected, realtime.connected);
  const sectors = useSectors('', 0, 100, true);
  const assume = useAssumeConversation();
  const close = useCloseConversation();
  const reassign = useReassignConversation();
  const send = useSendMessage();
  const conversation = realtime.authorized
    ? (detail.data ?? list.data?.dados.find((item) => item.public_id === selected))
    : undefined;
  const responsibleOnline = conversation?.atendente
    ? realtime.presence.get(conversation.atendente.public_id)
    : undefined;

  function openReassign() {
    setReassignSector(conversation?.setor?.public_id ?? '');
    setReassignReason('');
    setReassigning(true);
  }

  function submit() {
    if (!selected || !text.trim()) return;
    const normalized = text.trim();
    const previous = pendingSend.current;
    const attempt =
      previous?.conversationId === selected && previous.text === normalized
        ? previous
        : { conversationId: selected, text: normalized, key: crypto.randomUUID() };
    pendingSend.current = attempt;
    send.mutate(
      { id: selected, text: normalized, key: attempt.key },
      {
        onSuccess: () => {
          pendingSend.current = undefined;
          setText('');
        },
      },
    );
  }

  const error = list.error ?? detail.error ?? messages.error ?? send.error;
  const activeSectors = sectors.data?.dados ?? [];
  return (
    <AppShell
      title="Atendimento"
      subtitle={`Fila e conversas em andamento · ${realtime.connected ? 'tempo real conectado' : 'reconectando...'}`}
    >
      <div className={styles.workspace}>
        <aside className={styles.list}>
          <div className={styles.tabs}>
            {availableViews.map((item) => {
              const total = counts.data?.[item.value];
              return (
                <button key={item.value} onClick={() => setView(item.value)} aria-pressed={view === item.value}>
                  {item.label}
                  {/* Encerradas não é fila de trabalho pendente; contá-la só adicionaria ruído. */}
                  {item.value !== 'ENCERRADA' && !!total && <span className={styles.tabCount}>{total}</span>}
                </button>
              );
            })}
          </div>
          {list.data?.dados.map((item) => (
            <button
              className={`${styles.item} ${selected === item.public_id ? styles.active : ''}`}
              key={item.public_id}
              onClick={() => setSelected(item.public_id)}
            >
              <strong>{item.contato.nome ?? item.contato.telefone}</strong>
              <span>{item.ultima_mensagem ?? 'Sem mensagem'}</span>
              <small>{item.setor?.nome ?? item.status}</small>
            </button>
          ))}
        </aside>
        {conversation ? (
          <section className={styles.chat}>
            <header className={styles.header}>
              <div>
                <strong>{conversation.contato.nome ?? conversation.contato.telefone}</strong>
                <small>
                  {conversation.status} · {conversation.setor?.nome ?? 'Sem setor'}
                  {responsibleOnline !== undefined
                    ? ` · ${responsibleOnline ? 'responsável online' : 'responsável offline'}`
                    : ''}
                </small>
              </div>
              <div className={styles.actions}>
                {conversation.status === 'AGUARDANDO_ATENDENTE' && (
                  <Button onClick={() => assume.mutate(conversation.public_id)}>Assumir</Button>
                )}
                {conversation.status === 'COM_ATENDENTE' && (
                  <Button
                    variant="secondary"
                    onClick={() => close.mutate({ id: conversation.public_id, reason: 'Encerrado pelo atendimento' })}
                  >
                    Encerrar
                  </Button>
                )}
                {canManage && conversation.status !== 'ENCERRADA' && (
                  <Button variant="ghost" onClick={openReassign}>
                    Reatribuir
                  </Button>
                )}
              </div>
            </header>
            <div className={styles.messages}>
              {messages.data?.dados.map((message) => (
                <div
                  className={`${styles.bubble} ${
                    message.autor === 'SISTEMA' ? styles.system : message.direcao === 'SAIDA' ? styles.out : ''
                  }`}
                  key={message.public_id}
                >
                  {messageBodyText(message)}
                  <small>{messageTimestampLabel(message)}</small>
                </div>
              ))}
            </div>
            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Digite uma mensagem"
                disabled={conversation.status !== 'COM_ATENDENTE'}
              />
              <Button disabled={!text.trim() || send.isPending || conversation.status !== 'COM_ATENDENTE'}>
                Enviar
              </Button>
            </form>
          </section>
        ) : (
          <div className={styles.empty}>Selecione uma conversa</div>
        )}
      </div>
      {!realtime.authorized && <p role="alert">Você não tem mais acesso a essa conversa. A lista foi atualizada.</p>}
      {error && <p role="alert">{isApiError(error) ? error.message : 'Falha no atendimento.'}</p>}
      {reassigning && conversation && (
        <CrudModal
          title="Reatribuir conversa"
          subtitle="Move a conversa para outro setor, mesmo que ela ainda esteja com o bot ou sem atendimento."
          submitLabel="Reatribuir"
          pending={reassign.isPending}
          error={
            reassign.error
              ? isApiError(reassign.error)
                ? reassign.error.message
                : 'Não foi possível reatribuir.'
              : null
          }
          onClose={() => setReassigning(false)}
          onSubmit={(event) => {
            event.preventDefault();
            reassign.mutate(
              { id: conversation.public_id, setorId: reassignSector, reason: reassignReason },
              { onSuccess: () => setReassigning(false) },
            );
          }}
        >
          <div className={tenantStyles.form}>
            <label className={tenantStyles.wide}>
              <span>Setor de destino</span>
              <select value={reassignSector} onChange={(event) => setReassignSector(event.target.value)} required>
                <option value="" disabled>
                  Selecione um setor
                </option>
                {activeSectors.map((sector) => (
                  <option key={sector.public_id} value={sector.public_id}>
                    {sector.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={tenantStyles.wide}>
              <span>Motivo</span>
              <textarea
                value={reassignReason}
                onChange={(event) => setReassignReason(event.target.value)}
                minLength={3}
                maxLength={500}
                required
              />
            </label>
          </div>
        </CrudModal>
      )}
    </AppShell>
  );
}
