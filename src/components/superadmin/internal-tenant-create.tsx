'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { InternalShell } from './internal-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProvisionTenant } from '@/hooks/superadmin/use-provision-tenant';
import { isApiError } from '@/lib/api/api-error';
import styles from './internal-tenant-create.module.css';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;

export function InternalTenantCreate() {
  const [attemptKey] = useState(() => crypto.randomUUID());
  const [companyName, setCompanyName] = useState('');
  const [planId, setPlanId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const provision = useProvisionTenant();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (companyName.trim().length < 2 || adminName.trim().length < 2) return setValidation('Empresa e administrador precisam ter pelo menos dois caracteres.');
    if (!uuidPattern.test(planId)) return setValidation('Informe um UUID de plano válido.');
    if (!passwordPattern.test(password)) return setValidation('A senha deve ter 12 caracteres, maiúscula, minúscula e número.');
    if (password !== confirmation) return setValidation('A confirmação não corresponde à senha inicial.');
    setValidation(null);
    try { await provision.mutateAsync({ chaveIdempotencia: attemptKey, nome: companyName.trim(), planoId: planId.trim(), administrador: { nome: adminName.trim(), email: adminEmail.trim().toLowerCase(), senha: password } }); } catch { /* erro apresentado abaixo */ }
  }
  const error = provision.error ? (isApiError(provision.error) ? provision.error.message : 'Não foi possível iniciar o provisionamento.') : null;
  return <InternalShell title="Novo tenant" subtitle="Provisionamento manual e idempotente de um ambiente." actions={<Link href="/interno/tenants"><Button variant="ghost" icon={<ArrowLeft size={16} />}>Voltar</Button></Link>}><form className={styles.form} onSubmit={submit}><section className={styles.intro}><ShieldCheck size={20} /><div><strong>Chave da tentativa</strong><code>{attemptKey}</code><p>Esta chave será reutilizada automaticamente se você tentar novamente após uma falha.</p></div></section><div className={styles.grid}><section className={styles.card}><header><span><Building2 size={18} /></span><div><h2>Empresa e plano</h2><p>Identificação inicial do novo cliente.</p></div></header><div className={styles.fields}><Input label="Nome da empresa" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required disabled={provision.isPending} placeholder="Empresa Exemplo" icon={<Building2 size={16} />} /><Input label="UUID público do plano" value={planId} onChange={(event) => setPlanId(event.target.value)} required disabled={provision.isPending} placeholder="00000000-0000-4000-8000-000000000000" icon={<KeyRound size={16} />} hint="Será substituído por uma seleção quando existir endpoint público de planos." /></div></section><section className={styles.card}><header><span><UserRound size={18} /></span><div><h2>Administrador inicial</h2><p>Primeiro usuário responsável pelo tenant.</p></div></header><div className={styles.fields}><Input label="Nome completo" value={adminName} onChange={(event) => setAdminName(event.target.value)} required disabled={provision.isPending} icon={<UserRound size={16} />} /><Input label="E-mail" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required disabled={provision.isPending} autoComplete="email" icon={<Mail size={16} />} /><Input label="Senha inicial" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={provision.isPending} autoComplete="new-password" icon={<KeyRound size={16} />} hint="12 caracteres ou mais, com maiúscula, minúscula e número." /><Input label="Confirmar senha" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={provision.isPending} autoComplete="new-password" icon={<KeyRound size={16} />} /></div></section></div>{(validation || error) && <div className={styles.error} role="alert">{validation ?? error}</div>}<footer><p>O backend criará o registro central, banco físico, migrations, assinatura e administrador.</p><Button type="submit" disabled={provision.isPending}>{provision.isPending ? 'Provisionando...' : 'Criar e provisionar tenant'}</Button></footer></form></InternalShell>;
}
