'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Building2, CalendarDays, CreditCard, Database, LogIn, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { InternalShell } from './internal-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useChangeTenantPlan, useChangeTenantStatus, useInternalTenantDetail } from '@/hooks/superadmin/use-internal-tenant-detail';
import { useImpersonateTenant } from '@/hooks/superadmin/use-impersonate-tenant';
import { isApiError } from '@/lib/api/api-error';
import styles from './internal-tenant-detail.module.css';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labelStatus = (status: string) => status.replaceAll('_', ' ').toLocaleLowerCase('pt-BR').replace(/^./, (letter) => letter.toUpperCase());
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export function InternalTenantDetailView({ tenantId }: { tenantId: string }) {
  const detail = useInternalTenantDetail(tenantId);
  const statusMutation = useChangeTenantStatus(tenantId);
  const planMutation = useChangeTenantPlan(tenantId);
  const impersonate = useImpersonateTenant(tenantId, detail.data?.tenant.nome ?? 'tenant');
  const [action, setAction] = useState<'status' | 'plan' | null>(null);
  const [nextStatus, setNextStatus] = useState<'ATIVO' | 'SUSPENSO' | 'CANCELADO'>('SUSPENSO');
  const [planId, setPlanId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  if (detail.isLoading) return <InternalShell title="Detalhe do tenant"><div className={styles.state}>Carregando tenant...</div></InternalShell>;
  if (detail.error || !detail.data) return <InternalShell title="Tenant indisponível"><div className={styles.state}><strong>Não foi possível carregar este tenant.</strong><p>{isApiError(detail.error) ? detail.error.message : 'Verifique o identificador e tente novamente.'}</p><Link href="/interno/tenants">Voltar para a lista</Link></div></InternalShell>;

  const { tenant, usuarios, assinaturas } = detail.data;
  const cancelled = tenant.status === 'CANCELADO';
  const mutationError = statusMutation.error ?? planMutation.error ?? impersonate.error;

  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) return setValidation('Confirme que você entende o impacto desta ação.');
    if (reason.trim().length < 5) return setValidation('Informe um motivo com pelo menos cinco caracteres.');
    if (action === 'plan' && !uuidPattern.test(planId)) return setValidation('Informe um UUID de plano válido.');
    setValidation(null);
    try {
      if (action === 'status') await statusMutation.mutateAsync({ status: nextStatus, reason: reason.trim() });
      if (action === 'plan') await planMutation.mutateAsync({ planId: planId.trim(), reason: reason.trim() });
      setAction(null); setReason(''); setPlanId(''); setConfirmed(false);
    } catch { /* erro apresentado abaixo */ }
  }

  function openStatus(status: 'ATIVO' | 'SUSPENSO' | 'CANCELADO') {
    setNextStatus(status); setAction('status'); setValidation(null);
  }

  return <InternalShell title={tenant.nome} subtitle={`Tenant ${tenant.public_id}`} actions={<Link href="/interno/tenants"><Button variant="ghost" icon={<ArrowLeft size={16} />}>Voltar</Button></Link>}>
    <section className={styles.hero}><div className={styles.heroIcon}><Building2 size={25} /></div><div><span>IDENTIFICAÇÃO</span><h2>{tenant.nome}</h2><p>{tenant.public_id}</p></div><Badge tone={tenant.status === 'ATIVO' ? 'success' : tenant.status === 'PROVISIONANDO' ? 'warning' : 'neutral'}>{labelStatus(tenant.status)}</Badge></section>
    {tenant.mensagem_falha && <div className={styles.failure}><ShieldAlert size={18} /><div><strong>Falha de provisionamento</strong><p>{tenant.mensagem_falha}</p></div></div>}
    <section className={styles.facts}><article><Database size={18} /><span>Etapa</span><strong>{tenant.etapa_provisionamento ? labelStatus(tenant.etapa_provisionamento) : '—'}</strong></article><article><CreditCard size={18} /><span>Plano atual</span><strong>{tenant.plano?.nome ?? tenant.plano_nome ?? '—'}</strong></article><article><UsersRound size={18} /><span>Usuários</span><strong>{usuarios.length}</strong></article><article><CalendarDays size={18} /><span>Criado em</span><strong>{date(tenant.created_at)}</strong></article></section>
    <div className={styles.columns}><section className={styles.card}><header><div><h2>Usuários vinculados</h2><p>Contas existentes no tenant.</p></div></header><div className={styles.list}>{usuarios.length ? usuarios.map((user) => <div key={user.public_id}><span><UserRound size={16} /></span><div><strong>{user.nome}</strong><small>{user.email}</small></div><Badge tone={user.ativo === false ? 'neutral' : 'success'}>{user.papel ?? (user.ativo === false ? 'Inativo' : 'Ativo')}</Badge></div>) : <p>Nenhum usuário retornado.</p>}</div></section><section className={styles.card}><header><div><h2>Histórico de assinaturas</h2><p>Planos manuais e recorrentes.</p></div></header><div className={styles.list}>{assinaturas.length ? assinaturas.map((subscription) => <div key={subscription.public_id}><span><CreditCard size={16} /></span><div><strong>{subscription.plano?.nome ?? 'Plano sem nome'}</strong><small>{date(subscription.created_at)}</small></div><Badge tone={subscription.status === 'ATIVA' ? 'success' : 'neutral'}>{subscription.status}</Badge></div>) : <p>Nenhuma assinatura retornada.</p>}</div></section></div>
    <section className={styles.actionsCard}><header><Activity size={18} /><div><h2>Ações administrativas</h2><p>Todas as alterações exigem motivo e geram auditoria.</p></div></header><div className={styles.actionButtons}>{tenant.status === 'ATIVO' && <Button icon={<LogIn size={16} />} disabled={impersonate.isPending} onClick={() => impersonate.mutate()}>{impersonate.isPending ? 'Conectando...' : 'Conectar como tenant'}</Button>}{tenant.status === 'ATIVO' && <Button variant="secondary" onClick={() => openStatus('SUSPENSO')}>Suspender tenant</Button>}{tenant.status === 'SUSPENSO' && <Button variant="secondary" onClick={() => openStatus('ATIVO')}>Reativar tenant</Button>}{!cancelled && <Button variant="secondary" onClick={() => setAction('plan')}>Alterar plano</Button>}{!cancelled && <Button variant="danger" onClick={() => openStatus('CANCELADO')}>Cancelar tenant</Button>}{cancelled && <p>Tenant cancelado não pode ser reativado nem receber outro plano.</p>}</div>{impersonate.error && <div className={styles.error} role="alert">{isApiError(impersonate.error) ? impersonate.error.message : 'Não foi possível acessar este tenant.'}</div>}</section>
    {action && <div className={styles.modalBackdrop} role="presentation"><form className={styles.modal} onSubmit={submitAction}><header><div><span>CONFIRMAÇÃO OBRIGATÓRIA</span><h2>{action === 'plan' ? 'Alterar plano' : `${labelStatus(nextStatus)} tenant`}</h2></div><button type="button" onClick={() => setAction(null)}>×</button></header>{action === 'plan' && <label><span>UUID do novo plano</span><input value={planId} onChange={(event) => setPlanId(event.target.value)} required /></label>}<label><span>Motivo operacional</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required placeholder="Informe chamado, solicitação ou justificativa..." /></label><label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirmo que revisei o tenant e entendo o impacto.</label>{(validation || mutationError) && <div className={styles.error} role="alert">{validation ?? (isApiError(mutationError) ? mutationError.message : 'Não foi possível concluir a alteração.')}</div>}<footer><Button type="button" variant="ghost" onClick={() => setAction(null)}>Voltar</Button><Button type="submit" variant={nextStatus === 'CANCELADO' ? 'danger' : 'primary'} disabled={statusMutation.isPending || planMutation.isPending}>{statusMutation.isPending || planMutation.isPending ? 'Aplicando...' : 'Confirmar alteração'}</Button></footer></form></div>}
  </InternalShell>;
}
