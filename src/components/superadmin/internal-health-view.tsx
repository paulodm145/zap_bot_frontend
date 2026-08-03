'use client';

import { Activity, CheckCircle2, Database, RefreshCw, Server, XCircle } from 'lucide-react';
import { InternalShell } from './internal-shell';
import { Button } from '@/components/ui/button';
import { useInternalHealth, usePlatformReadiness } from '@/hooks/superadmin/use-internal-health';
import styles from './internal-health-view.module.css';

export function InternalHealthView() {
  const session = useInternalHealth();
  const readiness = usePlatformReadiness();
  const loading = session.isFetching || readiness.isFetching;
  return <InternalShell title="Saúde da plataforma" subtitle="Diagnóstico operacional da API e dependências." actions={<Button variant="secondary" onClick={() => { session.refetch(); readiness.refetch(); }} disabled={loading} icon={<RefreshCw size={15} />}>{loading ? 'Atualizando...' : 'Atualizar'}</Button>}><section className={styles.summary}><article><span className={session.isSuccess ? styles.ok : styles.bad}><Activity size={20} /></span><div><small>SESSÃO INTERNA</small><strong>{session.isLoading ? 'Verificando' : session.isSuccess ? 'Válida' : 'Inválida'}</strong><p>Validação do JWT exclusivo de superadmin.</p></div></article><article><span className={readiness.isSuccess ? styles.ok : styles.bad}><Server size={20} /></span><div><small>PRONTIDÃO</small><strong>{readiness.isLoading ? 'Verificando' : readiness.data?.status ?? 'Indisponível'}</strong><p>Estado consolidado das dependências da API.</p></div></article></section><section className={styles.card}><header><div><h2>Dependências</h2><p>Esta consulta é destinada a diagnóstico, não a polling contínuo.</p></div></header><div className={styles.dependencies}>{readiness.data?.dependencias?.length ? readiness.data.dependencias.map((dependency) => <div key={dependency.nome}><span>{dependency.nome.includes('postgres') ? <Database size={18} /> : <Server size={18} />}</span><div><strong>{dependency.nome}</strong><small>{dependency.disponivel ? 'Respondendo normalmente' : 'Não respondeu à verificação'}</small></div>{dependency.disponivel ? <CheckCircle2 className={styles.okIcon} size={19} /> : <XCircle className={styles.badIcon} size={19} />}</div>) : <p className={styles.empty}>{readiness.isLoading ? 'Consultando dependências...' : 'Nenhuma dependência foi retornada.'}</p>}</div></section></InternalShell>;
}
