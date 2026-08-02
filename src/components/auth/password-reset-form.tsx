'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePasswordReset } from '@/hooks/auth/use-password-reset';
import { isApiError } from '@/lib/api/api-error';
import styles from './auth.module.css';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;

export function PasswordResetForm() {
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const reset = usePasswordReset();

  useEffect(() => {
    if (token) window.history.replaceState({}, '', '/redefinir-senha');
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return setValidation('Este link de recuperação é inválido ou está incompleto.');
    if (!passwordPattern.test(password)) return setValidation('Use de 12 a 128 caracteres, incluindo maiúscula, minúscula e número.');
    if (password !== confirmation) return setValidation('As senhas informadas não coincidem.');
    setValidation(null);
    try { await reset.mutateAsync({ token, newPassword: password }); } catch { /* exibido abaixo */ }
  }

  const apiMessage = reset.error ? (isApiError(reset.error) && reset.error.code === 'TOKEN_RECUPERACAO_INVALIDO' ? 'Este link é inválido, expirou ou já foi utilizado. Solicite um novo.' : 'Não foi possível redefinir sua senha agora.') : null;

  if (reset.isSuccess) return <div className={`${styles.formCard} page-enter`}><div className={styles.sentIcon}><CheckCircle2 size={30} /></div><header><h2>Senha redefinida</h2><p>Sua nova senha já está ativa. As sessões anteriores foram encerradas por segurança.</p></header><Link href="/login"><Button>Ir para o login<ArrowRight size={17} /></Button></Link></div>;

  return <div className={`${styles.formCard} page-enter`}><header><span className={styles.step}>NOVA SENHA</span><h2>Crie uma senha segura</h2><p>O link será usado uma única vez e todas as sessões anteriores serão encerradas.</p></header><form className={styles.form} onSubmit={submit}><Input label="Nova senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={reset.isPending} icon={<LockKeyhole size={17} />} hint="12 caracteres ou mais, com maiúscula, minúscula e número." /><Input label="Confirmar nova senha" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={reset.isPending} icon={<LockKeyhole size={17} />} />{(validation || apiMessage) && <div className={styles.formError} role="alert">{validation ?? apiMessage}</div>}<Button type="submit" disabled={reset.isPending}>{reset.isPending ? 'Redefinindo...' : 'Redefinir senha'}<ArrowRight size={17} /></Button></form><Link className={styles.backLink} href="/recuperar-senha">Solicitar um novo link</Link></div>;
}
