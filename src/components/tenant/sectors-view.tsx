'use client';
import { useMemo, useState } from 'react';
import { Building2, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { CrudModal } from './crud-modal';
import { useDeleteSector, useSaveSector, useSectors } from '@/hooks/tenant/use-sectors';
import { useMe } from '@/hooks/tenant/use-me';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import type { Sector } from '@/features/tenant/types';
import { isApiError } from '@/lib/api/api-error';
import styles from './tenant.module.css';
export function SectorsView() {
  const [search, setSearch] = useState(''),
    [skip, setSkip] = useState(0),
    [take, setTake] = useState(20),
    [editing, setEditing] = useState<Sector | null | undefined>(undefined),
    [removing, setRemoving] = useState<Sector | undefined>(undefined),
    [nome, setNome] = useState(''),
    [descricao, setDescricao] = useState('');
  const debounced = useDebouncedValue(search),
    list = useSectors(debounced, skip, take),
    me = useMe(),
    save = useSaveSector(),
    remove = useDeleteSector();
  const canManage = me.data?.papel !== 'ATENDENTE';
  function open(s: Sector | null) {
    setEditing(s);
    setNome(s?.nome ?? '');
    setDescricao(s?.descricao ?? '');
  }
  const columns = useMemo<DataTableColumn<Sector>[]>(
    () => [
      {
        id: 'name',
        header: 'Setor',
        width: '32%',
        render: (s) => (
          <div className={styles.entity}>
            <span>
              <Building2 size={16} />
            </span>
            <div>
              <strong>{s.nome}</strong>
              <small>{s.public_id}</small>
            </div>
          </div>
        ),
      },
      { id: 'description', header: 'Descrição', width: '40%', render: (s) => s.descricao ?? '—' },
      {
        id: 'status',
        header: 'Status',
        width: '15%',
        render: (s) => <Badge tone={s.ativo ? 'success' : 'neutral'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>,
      },
    ],
    [],
  );
  const error = list.error ?? remove.error;
  return (
    <AppShell
      title="Setores"
      subtitle="Equipes responsáveis pelo atendimento."
      actions={
        canManage ? (
          <Button icon={<Plus size={17} />} onClick={() => open(null)}>
            Novo setor
          </Button>
        ) : undefined
      }
    >
      {error && <div className={styles.error}>{isApiError(error) ? error.message : 'Não foi possível concluir.'}</div>}
      <DataTable
        columns={columns}
        data={list.data?.dados ?? []}
        getRowId={(s) => s.public_id}
        pagination={{ skip: list.data?.skip ?? skip, take: list.data?.take ?? take, total: list.data?.total ?? 0 }}
        onPaginationChange={(p) => {
          setSkip(p.skip);
          setTake(p.take);
        }}
        loading={list.isLoading || list.isFetching}
        emptyTitle="Nenhum setor encontrado"
        emptyDescription="Crie um setor ou ajuste os termos da busca."
        toolbar={
          <label className={styles.search}>
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSkip(0);
              }}
              placeholder="Buscar setor..."
            />
          </label>
        }
        rowActions={
          canManage
            ? (s) => (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    icon={<Edit3 size={16} />}
                    aria-label={`Editar ${s.nome}`}
                    onClick={() => open(s)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    icon={<Trash2 size={16} />}
                    aria-label={`Excluir ${s.nome}`}
                    onClick={() => setRemoving(s)}
                  />
                </>
              )
            : undefined
        }
      />
      {editing !== undefined && (
        <CrudModal
          title={editing ? 'Editar setor' : 'Novo setor'}
          subtitle="Defina a equipe e sua responsabilidade operacional."
          pending={save.isPending}
          error={save.error ? (isApiError(save.error) ? save.error.message : 'Falha ao salvar.') : null}
          onClose={() => setEditing(undefined)}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ id: editing?.public_id, nome, descricao }, { onSuccess: () => setEditing(undefined) });
          }}
        >
          <div className={styles.form}>
            <label className={styles.wide}>
              <span>Nome do setor</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex.: Financeiro" />
            </label>
            <label className={styles.wide}>
              <span>Descrição</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva quais atendimentos este setor recebe."
              />
            </label>
          </div>
        </CrudModal>
      )}
      {removing && (
        <ConfirmDialog
          title={`Excluir ${removing.nome}?`}
          description="O setor deixa de receber novas conversas. As conversas já direcionadas a ele não são removidas."
          pending={remove.isPending}
          error={remove.error ? (isApiError(remove.error) ? remove.error.message : 'Falha ao excluir.') : null}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => remove.mutate(removing.public_id, { onSuccess: () => setRemoving(undefined) })}
        />
      )}
    </AppShell>
  );
}
