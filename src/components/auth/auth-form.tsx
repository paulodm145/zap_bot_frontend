'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from './auth.module.css';
import { useLogin } from '@/hooks/auth/use-login';
import { isApiError } from '@/lib/api/api-error';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, senha: password });
    } catch (error) {
      if (isApiError(error) && error.code === 'CREDENCIAIS_INVALIDAS') setPassword('');
    }
  }
  const errorMessage = login.error ? (isApiError(login.error) ? login.error.message : 'Não foi possível conectar ao servidor. Tente novamente.') : null;
  return (
    <div className={`${styles.formCard} page-enter`}>
      <div className={styles.mobileLogo}><span>zapbot</span></div>
      <header><span className={styles.step}>ACESSO SEGURO</span><h2>Que bom ter você de volta</h2><p>Entre para gerenciar seus fluxos e conversas.</p></header>
      <form onSubmit={submit} className={styles.form}>
        <Input label="E-mail" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" autoComplete="email" required disabled={login.isPending} icon={<Mail size={17} />} />
        <div className={styles.passwordField}>
          <Input label="Senha" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required disabled={login.isPending} icon={<LockKeyhole size={17} />} />
          <button type="button" className={styles.eye} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <div className={styles.formMeta}><label><input type="checkbox" /> Lembrar de mim</label><Link href="/recuperar-senha">Esqueci minha senha</Link></div>
        {errorMessage && <div className={styles.formError} role="alert">{errorMessage}</div>}
        <Button type="submit" disabled={login.isPending}>{login.isPending ? 'Entrando...' : 'Entrar'}<ArrowRight size={17} /></Button>
      </form>
      <p className={styles.help}>Ainda não possui acesso? <a href="mailto:contato@zapbot.com.br">Fale com nossa equipe</a></p>
    </div>
  );
}

export function RecoveryForm() {
  const [sent, setSent] = useState(false);
  return (
    <div className={`${styles.formCard} page-enter`}>
      <header><span className={styles.step}>RECUPERAÇÃO DE ACESSO</span><h2>{sent ? 'Confira seu e-mail' : 'Recupere sua senha'}</h2><p>{sent ? 'Se o endereço estiver cadastrado, você receberá as instruções em instantes.' : 'Informe seu e-mail e enviaremos um link seguro para criar uma nova senha.'}</p></header>
      {!sent ? <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className={styles.form}><Input label="E-mail de acesso" name="email" type="email" placeholder="voce@empresa.com.br" required icon={<Mail size={17} />} /><Button type="submit">Enviar instruções<ArrowRight size={17} /></Button></form> : <div className={styles.sentIcon}><Mail size={28} /></div>}
      <Link className={styles.backLink} href="/login">← Voltar para o login</Link>
    </div>
  );
}
