'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Building2, CircleDollarSign, Database, Plus, ShieldCheck } from 'lucide-react';
import { InternalShell } from './internal-shell';
import { Button } from '@/components/ui/button';
import { useInternalHealth } from '@/hooks/superadmin/use-internal-health';
import styles from './internal-dashboard.module.css';
import { useInternalTenants } from '@/hooks/superadmin/use-internal-tenants';

export function InternalDashboard() {
  const health = useInternalHealth();
  const activeTenants = useInternalTenants({ skip: 0, take: 1, status: 'ATIVO' });
  const online = health.isSuccess;
  return <InternalShell title="Visão geral" subtitle="Operação e saúde da plataforma ZapBot." actions={<Link href="/interno/tenants/novo"><Button icon={<Plus size={16} />}>Novo tenant</Button></Link>}><section className={styles.notice}><ShieldCheck size={18} /><div><strong>Sessão administrativa isolada</strong><p>Este ambiente utiliza credenciais e permissões diferentes das contas de clientes.</p></div></section><section className={styles.stats}><article><span><Building2 size={19} /></span><p>Tenants ativos</p><strong>{activeTenants.data?.total ?? '—'}</strong><small>Obtido da listagem administrativa</small></article><article><span><CircleDollarSign size={19} /></span><p>Consumo agregado</p><strong>—</strong><small>Aguardando endpoint agregado</small></article><article><span><AlertTriangle size={19} /></span><p>Falhas de provisionamento</p><strong>—</strong><small>Disponível na lista de tenants</small></article><article><span className={online ? styles.online : styles.offline}><Activity size={19} /></span><p>Sessão da API interna</p><strong>{health.isLoading ? 'Verificando' : online ? 'Operacional' : 'Indisponível'}</strong><small>{online ? 'JWT interno aceito' : 'Não foi possível validar a sessão'}</small></article></section><div className={styles.grid}><section className={styles.card}><header><div><h2>Ações operacionais</h2><p>Atalhos para as jornadas mais frequentes.</p></div></header><div className={styles.shortcuts}><Link href="/interno/tenants"><span><Building2 size={18} /></span><div><strong>Gerenciar tenants</strong><small>Buscar, suspender e alterar planos</small></div><ArrowRight size={16} /></Link><Link href="/interno/tenants/novo"><span><Plus size={18} /></span><div><strong>Provisionar tenant</strong><small>Criar ambiente e administrador inicial</small></div><ArrowRight size={16} /></Link></div></section><section className={styles.card}><header><div><h2>Infraestrutura</h2><p>Resumo das dependências administrativas.</p></div></header><div className={styles.dependencies}><div><Database size={17} /><span>API interna</span><b className={online ? styles.ok : styles.bad}>{online ? 'Disponível' : 'Sem resposta'}</b></div><div><Activity size={17} /><span>Métricas agregadas</span><b>Não configurado</b></div></div></section></div></InternalShell>;
}
