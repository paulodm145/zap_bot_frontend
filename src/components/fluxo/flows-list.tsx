'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Search, Workflow } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FeedbackToast } from '@/components/ui/feedback-toast';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import type { FlowStatusFilter, FlowSummary } from '@/features/flows/types';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import { useCreateFlow } from '@/hooks/flows/use-create-flow';
import { useFlows } from '@/hooks/flows/use-flows';
import { usePublishFlow } from '@/hooks/flows/use-publish-flow';
import { useMe } from '@/hooks/tenant/use-me';
import { isApiError } from '@/lib/api/api-error';
import styles from './flows-list.module.css';

/**
 * Publica um fluxo direto da lista, sem abrir o editor. Não existe endpoint
 * de "despublicar" — uma vez publicado sem alterações pendentes, o toggle só
 * mostra o estado, travado, porque não há para onde voltar.
 */
function FlowPublishToggle({ flow, canManage }: { flow: FlowSummary; canManage: boolean }) {
  const publish = usePublishFlow(flow.public_id);
  const published = flow.ativo && !flow.possui_alteracoes_nao_publicadas;
  return (
    <>
      <ToggleSwitch
        checked={published}
        disabled={!canManage || published || publish.isPending}
        label={published ? `${flow.nome} já está publicado` : `Publicar ${flow.nome}`}
        onCheckedChange={(next) => {
          if (next && !published) publish.mutate();
        }}
      />
      {publish.error && (
        <FeedbackToast
          error={publish.error}
          title={`Não foi possível publicar “${flow.nome}”`}
          key={isApiError(publish.error) ? `${publish.error.code}-${publish.error.correlationId ?? ''}` : 'inesperado'}
        />
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function FlowsList() {
  const router = useRouter();
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FlowStatusFilter | ''>('');
  const debouncedSearch = useDebouncedValue(search);
  const flows = useFlows({ skip, take, search: debouncedSearch, status: status || undefined });
  const createFlow = useCreateFlow();
  const me = useMe();
  const canManage = me.data?.papel !== 'ATENDENTE';
  const columns = useMemo<DataTableColumn<FlowSummary>[]>(
    () => [
      {
        id: 'name',
        header: 'Fluxo',
        accessor: 'nome',
        sortable: false,
        width: '31%',
        render: (flow) => (
          <div className={styles.flowName}>
            <span>
              <Workflow size={16} />
            </span>
            <div>
              <strong>{flow.nome}</strong>
              <small>{flow.public_id}</small>
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        width: '18%',
        render: (flow) => (
          <Badge
            tone={flow.ativo && !flow.possui_alteracoes_nao_publicadas ? 'success' : flow.ativo ? 'warning' : 'neutral'}
          >
            {flow.ativo && !flow.possui_alteracoes_nao_publicadas
              ? 'Publicado'
              : flow.ativo
                ? 'Alterações pendentes'
                : 'Rascunho'}
          </Badge>
        ),
      },
      { id: 'version', header: 'Versão', accessor: 'versao', width: '10%', align: 'center' },
      {
        id: 'publish',
        header: 'Publicar',
        width: '10%',
        align: 'center',
        render: (flow) => <FlowPublishToggle flow={flow} canManage={canManage} />,
      },
      {
        id: 'published',
        header: 'Publicação',
        width: '18%',
        hideOnMobile: true,
        render: (flow) => (flow.publicado_at ? formatDate(flow.publicado_at) : '—'),
      },
      {
        id: 'updated',
        header: 'Atualização',
        width: '18%',
        hideOnMobile: true,
        render: (flow) => formatDate(flow.updated_at),
      },
    ],
    [canManage],
  );
  const errorMessage = flows.error
    ? isApiError(flows.error)
      ? flows.error.message
      : 'Não foi possível carregar os fluxos.'
    : null;

  return (
    <AppShell
      title="Meus fluxos"
      subtitle="Crie e organize suas automações."
      actions={
        canManage ? (
          <Button
            onClick={() => createFlow.mutate({ name: 'Novo fluxo' })}
            disabled={createFlow.isPending}
            icon={<Plus size={17} />}
          >
            {createFlow.isPending ? 'Criando...' : 'Novo fluxo'}
          </Button>
        ) : undefined
      }
    >
      {(errorMessage || createFlow.error) && (
        <div className={styles.error} role="alert">
          {errorMessage ??
            (isApiError(createFlow.error) ? createFlow.error.message : 'Não foi possível criar o fluxo.')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={flows.data?.dados ?? []}
        getRowId={(flow) => flow.public_id}
        pagination={{ skip: flows.data?.skip ?? skip, take: flows.data?.take ?? take, total: flows.data?.total ?? 0 }}
        onPaginationChange={(pagination) => {
          setSkip(pagination.skip);
          setTake(pagination.take);
        }}
        loading={flows.isLoading || flows.isFetching}
        emptyTitle="Nenhum fluxo encontrado"
        emptyDescription="Crie seu primeiro fluxo ou altere os filtros da busca."
        toolbar={
          <>
            <label className={styles.search}>
              <Search size={15} />
              <span className="sr-only">Buscar fluxo</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSkip(0);
                }}
                placeholder="Buscar fluxo..."
              />
            </label>
            <select
              className={styles.status}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as FlowStatusFilter | '');
                setSkip(0);
              }}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos os estados</option>
              <option value="RASCUNHO">Rascunhos</option>
              <option value="PUBLICADO">Publicados</option>
            </select>
          </>
        }
        rowActions={(flow) => (
          <Button
            variant="ghost"
            size="icon"
            icon={<MoreHorizontal size={17} />}
            aria-label={`Abrir ${flow.nome}`}
            onClick={() => router.push(`/fluxos/${flow.public_id}`)}
          />
        )}
      />
    </AppShell>
  );
}
