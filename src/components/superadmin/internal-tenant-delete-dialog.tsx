'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useDeleteTenant } from '@/hooks/superadmin/use-internal-tenant-detail';
import { isApiError } from '@/lib/api/api-error';
import styles from './internal-tenant-detail.module.css';

export function InternalTenantDeleteDialog({ tenantId, tenantName, onClose }: { tenantId: string; tenantName: string; onClose: () => void }) {
  const remove = useDeleteTenant(tenantId);
  const [password, setPassword] = useState('');
  const [typedName, setTypedName] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (typedName !== tenantName) return setValidation(`Digite exatamente “${tenantName}”.`);
    if (reason.trim().length < 5) return setValidation('Informe um motivo com pelo menos cinco caracteres.');
    if (!confirmed) return setValidation('Marque a confirmação de exclusão irreversível.');
    setValidation(null);
    try { await remove.mutateAsync({ password, tenantName: typedName, reason: reason.trim() }); }
    catch (error) { if (isApiError(error) && error.status === 401) setPassword(''); }
  }

  const error = remove.error ? (isApiError(remove.error) ? remove.error.message : 'Não foi possível excluir o tenant.') : null;
  return <div className={styles.modalBackdrop} role="presentation"><form className={styles.modal} onSubmit={submit} aria-label="Excluir tenant definitivamente"><header><div><span>OPERAÇÃO IRREVERSÍVEL</span><h2>Excluir definitivamente</h2></div><button type="button" disabled={remove.isPending} onClick={onClose}>×</button></header><p className={styles.destructiveWarning}>O banco, usuários, sessões, conversas e mensagens serão removidos sem possibilidade de recuperação.</p><label><span>Senha atual do superadministrador</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={remove.isPending} autoComplete="current-password" /></label><label><span>Digite o nome exato: {tenantName}</span><input value={typedName} onChange={(event) => setTypedName(event.target.value)} required disabled={remove.isPending} /></label><label><span>Motivo da exclusão</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required disabled={remove.isPending} /></label><label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={remove.isPending} /> Confirmo a exclusão definitiva e irreversível deste tenant.</label>{(validation || error) && <div className={styles.error} role="alert">{validation ?? error}</div>}<footer><Button type="button" variant="ghost" disabled={remove.isPending} onClick={onClose}>Voltar</Button><Button type="submit" variant="danger" disabled={remove.isPending}>{remove.isPending ? 'Excluindo...' : 'Excluir definitivamente'}</Button></footer></form></div>;
}
