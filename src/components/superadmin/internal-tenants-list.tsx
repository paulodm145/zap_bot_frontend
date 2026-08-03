'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, MoreHorizontal, Plus, Search } from 'lucide-react';
import { InternalShell } from './internal-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn, type DataTableSort } from '@/components/ui/data-table';
import type { InternalTenantSummary, TenantStatus } from '@/features/superadmin/types';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import { useInternalTenants } from '@/hooks/superadmin/use-internal-tenants';
import { isApiError } from '@/lib/api/api-error';
import styles from './internal-tenants-list.module.css';

const statusLabels: Record<TenantStatus, string> = { AGUARDANDO_PAGAMENTO: 'Aguardando pagamento', PROVISIONANDO: 'Provisionando', ATIVO: 'Ativo', SUSPENSO: 'Suspenso', CANCELADO: 'Cancelado', FALHA_PROVISIONAMENTO: 'Falha' };
const statusTone = (status: TenantStatus) => status === 'ATIVO' ? 'success' as const : status === 'PROVISIONANDO' || status === 'AGUARDANDO_PAGAMENTO' ? 'warning' as const : 'neutral' as const;
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export function InternalTenantsList() {
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TenantStatus | ''>('');
  const [planId, setPlanId] = useState('');
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'updated_at', direction: 'desc' });
  const debouncedSearch = useDebouncedValue(search);
  const debouncedPlan = useDebouncedValue(planId);
  const tenants = useInternalTenants({ skip, take, search: debouncedSearch, status: status || undefined, planId: debouncedPlan || undefined, orderBy: sort.columnId as 'nome' | 'status' | 'created_at' | 'updated_at', order: sort.direction });
  const columns = useMemo<DataTableColumn<InternalTenantSummary>[]>(() => [
    { id: 'nome', header: 'Tenant', accessor: 'nome', sortable: true, width: '27%', render: (tenant) => <div className={styles.tenant}><span><Building2 size={16} /></span><div><strong>{tenant.nome}</strong><small>{tenant.public_id}</small></div></div> },
    { id: 'status', header: 'Status', sortable: true, width: '17%', render: (tenant) => <Badge tone={statusTone(tenant.status)}>{statusLabels[tenant.status] ?? tenant.status}</Badge> },
    { id: 'plan', header: 'Plano', width: '14%', render: (tenant) => tenant.plano?.nome ?? tenant.plano_nome ?? '—' },
    { id: 'step', header: 'Provisionamento', width: '18%', hideOnMobile: true, render: (tenant) => tenant.etapa_provisionamento?.replaceAll('_', ' ') ?? '—' },
    { id: 'created_at', header: 'Criação', sortable: true, width: '14%', hideOnMobile: true, render: (tenant) => formatDate(tenant.created_at) },
    { id: 'updated_at', header: 'Atualização', sortable: true, width: '14%', hideOnMobile: true, render: (tenant) => formatDate(tenant.updated_at) },
  ], []);
  const error = tenants.error ? (isApiError(tenants.error) ? tenants.error.message : 'Não foi possível carregar os tenants.') : null;
  return <InternalShell title="Tenants" subtitle="Clientes, provisionamento e situação operacional." actions={<Link href="/interno/tenants/novo"><Button icon={<Plus size={16} />}>Novo tenant</Button></Link>}>{error && <div className={styles.error} role="alert">{error}<button onClick={() => tenants.refetch()}>Tentar novamente</button></div>}<DataTable color="blue" columns={columns} data={tenants.data?.dados ?? []} getRowId={(tenant) => tenant.public_id} pagination={{ skip: tenants.data?.skip ?? skip, take: tenants.data?.take ?? take, total: tenants.data?.total ?? 0 }} onPaginationChange={({ skip: nextSkip, take: nextTake }) => { setSkip(nextSkip); setTake(nextTake); }} sort={sort} onSortChange={(next) => { setSort(next); setSkip(0); }} loading={tenants.isLoading || tenants.isFetching} emptyTitle="Nenhum tenant encontrado" emptyDescription="Altere os filtros ou inicie um novo provisionamento." toolbar={<><label className={styles.search}><Search size={15} /><span className="sr-only">Buscar tenant</span><input value={search} onChange={(event) => { setSearch(event.target.value); setSkip(0); }} placeholder="Buscar por nome..." /></label><select value={status} onChange={(event) => { setStatus(event.target.value as TenantStatus | ''); setSkip(0); }} aria-label="Filtrar por status"><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className={styles.plan} value={planId} onChange={(event) => { setPlanId(event.target.value); setSkip(0); }} placeholder="UUID do plano" aria-label="Filtrar pelo UUID do plano" /></>} rowActions={(tenant) => <Link href={`/interno/tenants/${tenant.public_id}`}><Button variant="ghost" size="icon" aria-label={`Abrir ${tenant.nome}`} icon={<MoreHorizontal size={17} />} /></Link>} /></InternalShell>;
}
