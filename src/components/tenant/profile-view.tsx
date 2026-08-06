'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { useChangeOwnEmail, useChangeOwnPassword, useMe, useUpdateMe } from '@/hooks/tenant/use-me';
import { isApiError } from '@/lib/api/api-error';
import styles from './tenant.module.css';

export function ProfileView() {
  const me = useMe(),
    update = useUpdateMe(),
    password = useChangeOwnPassword(),
    email = useChangeOwnEmail();
  const [name, setName] = useState<string | null>(null),
    [current, setCurrent] = useState(''),
    [nextPassword, setNextPassword] = useState(''),
    [newEmail, setNewEmail] = useState('');
  if (me.isLoading)
    return (
      <AppShell title="Meu perfil">
        <div className={styles.state}>Carregando perfil...</div>
      </AppShell>
    );
  if (!me.data)
    return (
      <AppShell title="Meu perfil">
        <div className={styles.state}>Não foi possível carregar o perfil.</div>
      </AppShell>
    );
  const error = update.error ?? password.error ?? email.error;
  return (
    <AppShell title="Meu perfil" subtitle={`${me.data.tenant.nome} · ${me.data.papel}`}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Dados pessoais</h2>
          <p>Atualize como seu nome aparece.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate(name ?? me.data.nome);
            }}
          >
            <label>
              Nome
              <input value={name ?? me.data.nome} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              E-mail
              <input value={me.data.email} disabled />
            </label>
            <div className={styles.actions}>
              <Button>Salvar nome</Button>
            </div>
          </form>
        </section>
        <section className={styles.card}>
          <h2>Alterar e-mail</h2>
          <p>A sessão será encerrada após a alteração.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              email.mutate({ currentPassword: current, newEmail });
            }}
          >
            <label>
              Novo e-mail
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </label>
            <label>
              Senha atual
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
            <Button>Alterar e-mail</Button>
          </form>
        </section>
        <section className={styles.card}>
          <h2>Alterar senha</h2>
          <p>Use 12 caracteres, maiúscula, minúscula e número.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              password.mutate({ currentPassword: current, newPassword: nextPassword });
            }}
          >
            <label>
              Senha atual
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
            <label>
              Nova senha
              <input type="password" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} required />
            </label>
            <Button>Alterar senha</Button>
          </form>
        </section>
        <section className={styles.card}>
          <h2>Permissões e setores</h2>
          <p>Definidos pelo administrador.</p>
          {me.data.setores.map((s) => (
            <span className={styles.pill} key={s.public_id}>
              {s.nome}
            </span>
          ))}
        </section>
      </div>
      {error && <div className={styles.error}>{isApiError(error) ? error.message : 'Não foi possível salvar.'}</div>}
    </AppShell>
  );
}
