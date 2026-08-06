'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { useInternalLogin } from '@/hooks/superadmin/use-internal-login';
import { useInternalSession } from '@/hooks/superadmin/use-internal-session';
import { useConfigureInternalTotp, useVerifyInternalTotp } from '@/hooks/superadmin/use-internal-totp';
import { isApiError } from '@/lib/api/api-error';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';
import styles from './internal-auth.module.css';

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <Logo />
        <div>
          <span>OPERAÇÃO ZAPBOT</span>
          <h1>Controle interno com acesso reforçado.</h1>
          <p>Ambiente exclusivo para gestão da plataforma, provisionamento e acompanhamento dos clientes.</p>
        </div>
        <small>Área restrita à equipe operadora</small>
      </section>
      <section className={styles.panel}>{children}</section>
    </main>
  );
}

export function InternalLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useInternalLogin();
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, password });
    } catch {
      setPassword('');
    }
  }
  const error = login.error
    ? isApiError(login.error)
      ? login.error.message
      : 'Não foi possível acessar o servidor interno.'
    : null;
  return (
    <AuthFrame>
      <div className={styles.card}>
        <span className={styles.icon}>
          <ShieldCheck size={24} />
        </span>
        <header>
          <small>SUPERADMIN</small>
          <h2>Acesso administrativo</h2>
          <p>Use suas credenciais internas. Contas de clientes não são aceitas aqui.</p>
        </header>
        <form onSubmit={submit}>
          <Input
            label="E-mail interno"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={login.isPending}
            icon={<Mail size={17} />}
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={login.isPending}
            icon={<LockKeyhole size={17} />}
          />
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Validando...' : 'Continuar'}
            <ArrowRight size={16} />
          </Button>
        </form>
        <Link href="/login">Acessar como cliente</Link>
      </div>
    </AuthFrame>
  );
}

export function InternalTwoFactorForm() {
  const session = useInternalSession();
  const configure = useConfigureInternalTotp();
  const verify = useVerifyInternalTotp();
  const [code, setCode] = useState('');
  const stateToken = session.stateToken ?? '';
  if (session.status !== 'second_factor')
    return (
      <AuthFrame>
        <div className={styles.card}>
          <h2>Sessão temporária expirada</h2>
          <p>Volte ao login para iniciar uma nova validação.</p>
          <Button
            onClick={() => {
              internalSessionStore.clear();
              window.location.href = '/interno/login';
            }}
          >
            Voltar ao login
          </Button>
        </div>
      </AuthFrame>
    );
  const error = configure.error ?? verify.error;
  return (
    <AuthFrame>
      <div className={styles.card}>
        <span className={styles.icon}>
          <KeyRound size={24} />
        </span>
        <header>
          <small>SEGUNDO FATOR</small>
          <h2>{session.requiresConfiguration ? 'Configure seu autenticador' : 'Confirme o código'}</h2>
          <p>
            {session.requiresConfiguration
              ? 'Gere o QR code, cadastre-o no aplicativo autenticador e confirme o primeiro código.'
              : 'Digite o código de seis dígitos do seu aplicativo autenticador.'}
          </p>
        </header>
        {session.requiresConfiguration && !configure.data && (
          <Button variant="secondary" onClick={() => configure.mutate(stateToken)} disabled={configure.isPending}>
            {configure.isPending ? 'Gerando...' : 'Gerar QR code'}
          </Button>
        )}
        {configure.data && (
          <div className={styles.qr}>
            <Image
              src={configure.data.qrCode}
              alt="QR code para configurar o autenticador"
              width={180}
              height={180}
              unoptimized
            />
            <code>{configure.data.segredo}</code>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            verify.mutate({ stateToken, code });
          }}
        >
          <label className={styles.code}>
            <span>Código de verificação</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              placeholder="000000"
              required
            />
          </label>
          {error && (
            <div className={styles.error} role="alert">
              {isApiError(error) ? error.message : 'Não foi possível validar o código.'}
            </div>
          )}
          <Button type="submit" disabled={code.length !== 6 || verify.isPending}>
            {verify.isPending ? 'Verificando...' : 'Verificar e entrar'}
            <ArrowRight size={16} />
          </Button>
        </form>
        <button
          className={styles.restart}
          onClick={() => {
            internalSessionStore.clear();
            window.location.href = '/interno/login';
          }}
        >
          Recomeçar login
        </button>
      </div>
    </AuthFrame>
  );
}
