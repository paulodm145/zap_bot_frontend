'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, MessageSquare, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { CrudModal } from './crud-modal';
import {
  useContacts,
  useDeleteContact,
  useSaveContact,
  useStartConversation,
} from '@/hooks/tenant/use-contacts';
import { useMe } from '@/hooks/tenant/use-me';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import type { Contact } from '@/features/tenant/types';
import { isApiError } from '@/lib/api/api-error';
import styles from './tenant.module.css';

export function ContactsView() {
  const router = useRouter();
  const [search, setSearch] = useState(''),
    [skip, setSkip] = useState(0),
    [take, setTake] = useState(20),
    [editing, setEditing] = useState<Contact | null | undefined>(undefined),
    [removing, setRemoving] = useState<Contact | undefined>(undefined),
    [nome, setNome] = useState(''),
    [telefone, setTelefone] = useState('');
  const debounced = useDebouncedValue(search),
    list = useContacts(debounced, skip, take),
    me = useMe(),
    save = useSaveContact(),
    remove = useDeleteContact(),
    start = useStartConversation();
  const canManage = me.data?.papel !== 'ATENDENTE';

  const debouncedTelefone = useDebouncedValue(telefone);
  const digitosTelefone = debouncedTelefone.replace(/\D/g, '');
  const buscaTelefone = useContacts(digitosTelefone, 0, 3, editing !== undefined && digitosTelefone.length >= 8);
  const contatoComMesmoTelefone = buscaTelefone.data?.dados.find((item) => item.public_id !== editing?.public_id);

  function open(c: Contact | null) {
    setEditing(c);
    setNome(c?.nome ?? '');
    setTelefone(c?.telefone ?? '');
  }

  function startConversation(contact: Contact) {
    start.mutate(
      { contactId: contact.public_id },
      { onSuccess: (resultado) => router.push(`/atendimento?conversa=${resultado.conversaId}`) },
    );
  }

  const columns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: 'name',
        header: 'Contato',
        width: '38%',
        render: (c) => (
          <div className={styles.entity}>
            <span>
              <UserRound size={16} />
            </span>
            <div>
              <strong>{c.nome ?? 'Sem nome'}</strong>
              <small>{c.telefone}</small>
            </div>
          </div>
        ),
      },
      {
        id: 'conversas',
        header: 'Conversas',
        width: '18%',
        render: (c) => (
          <Badge tone={c._count.conversas > 0 ? 'success' : 'neutral'}>
            {c._count.conversas} {c._count.conversas === 1 ? 'conversa' : 'conversas'}
          </Badge>
        ),
      },
    ],
    [],
  );
  // Erro de carregar a lista fica fixo na tela porque afeta tudo que segue
  // (tabela vazia sem explicação). Erros de excluir/iniciar conversa são
  // ações pontuais — já aparecem em toast (ver AppProviders) e, no caso da
  // exclusão, também dentro do próprio ConfirmDialog.
  const error = list.error;
  return (
    <AppShell
      title="Contatos"
      subtitle="Cadastro de contatos e ponto de partida para mensagens diretas."
      actions={
        canManage ? (
          <Button icon={<Plus size={17} />} onClick={() => open(null)}>
            Novo contato
          </Button>
        ) : undefined
      }
    >
      {error && <div className={styles.error}>{isApiError(error) ? error.message : 'Não foi possível concluir.'}</div>}
      <DataTable
        columns={columns}
        data={list.data?.dados ?? []}
        getRowId={(c) => c.public_id}
        pagination={{ skip: list.data?.skip ?? skip, take: list.data?.take ?? take, total: list.data?.total ?? 0 }}
        onPaginationChange={(p) => {
          setSkip(p.skip);
          setTake(p.take);
        }}
        loading={list.isLoading || list.isFetching}
        emptyTitle="Nenhum contato encontrado"
        emptyDescription="Cadastre um contato ou ajuste os termos da busca."
        toolbar={
          <label className={styles.search}>
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSkip(0);
              }}
              placeholder="Buscar por nome ou telefone..."
            />
          </label>
        }
        rowActions={(c) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              icon={<MessageSquare size={16} />}
              aria-label={`Enviar mensagem para ${c.nome ?? c.telefone}`}
              disabled={start.isPending}
              onClick={() => startConversation(c)}
            />
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  icon={<Edit3 size={16} />}
                  aria-label={`Editar ${c.nome ?? c.telefone}`}
                  onClick={() => open(c)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  icon={<Trash2 size={16} />}
                  aria-label={`Excluir ${c.nome ?? c.telefone}`}
                  onClick={() => setRemoving(c)}
                />
              </>
            )}
          </>
        )}
      />
      {editing !== undefined && (
        <CrudModal
          title={editing ? 'Editar contato' : 'Novo contato'}
          subtitle="Nome e telefone usados para localizar o contato e iniciar conversas."
          pending={save.isPending}
          error={save.error ? (isApiError(save.error) ? save.error.message : 'Falha ao salvar.') : null}
          onClose={() => setEditing(undefined)}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ id: editing?.public_id, nome, telefone }, { onSuccess: () => setEditing(undefined) });
          }}
        >
          <div className={styles.form}>
            <label className={styles.wide}>
              <span>Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Cliente" />
            </label>
            <label className={styles.wide}>
              <span>Telefone (com DDI)</span>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                placeholder="Ex.: 5511988887777"
              />
              {contatoComMesmoTelefone && (
                <small className={styles.hint}>
                  Já existe um contato com esse número: {contatoComMesmoTelefone.nome ?? contatoComMesmoTelefone.telefone}
                </small>
              )}
            </label>
          </div>
        </CrudModal>
      )}
      {removing && (
        <ConfirmDialog
          title={`Excluir ${removing.nome ?? removing.telefone}?`}
          description="O contato deixa de aparecer nas buscas. Conversas já existentes não são removidas."
          pending={remove.isPending}
          error={remove.error ? (isApiError(remove.error) ? remove.error.message : 'Falha ao excluir.') : null}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => remove.mutate(removing.public_id, { onSuccess: () => setRemoving(undefined) })}
        />
      )}
    </AppShell>
  );
}
