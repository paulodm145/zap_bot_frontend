'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Bell, Building2, ChevronDown, LogOut, Menu, MessagesSquare, Settings, ShieldCheck, Users, Workflow, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import styles from './app-shell.module.css';
import { useLogout } from '@/hooks/auth/use-logout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useSession } from '@/hooks/auth/use-session';
import { sessionStore } from '@/lib/auth/session-store';

const nav = [
  { href: '/dashboard', label: 'Visão geral', icon: BarChart3 },
  { href: '/fluxos', label: 'Meus fluxos', icon: Workflow },
  { href: '/atendimento', label: 'Atendimento', icon: MessagesSquare },
  { href: '/setores', label: 'Setores', icon: Building2 },
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/empresa', label: 'Dados da empresa', icon: Building2 },
  { href: '/contas-whatsapp', label: 'WhatsApp', icon: Settings },
];

export function AppShell({ children, title, subtitle, actions }: { children: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  return (
    <AuthGuard>
    <div className={styles.shell}>
      {open && <button className={styles.overlay} onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.logoRow}><Logo /><button className={styles.close} onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className={styles.workspace}><span>{session.user?.nome.slice(0,2).toUpperCase() ?? 'EA'}</span><div><small>Workspace</small><strong>{session.impersonation?.tenantName ?? 'Meu tenant'}</strong></div><ChevronDown size={15} /></div>
        <nav aria-label="Navegação principal">{nav.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href) && item.href !== '#'; return <Link key={item.label} href={item.href} className={active ? styles.active : ''} onClick={() => setOpen(false)}><Icon size={19} /><span>{item.label}</span>{item.label === 'Atendimento' && <b>8</b>}</Link>; })}</nav>
        <div className={styles.sidebarBottom}><Link href="/perfil"><Settings size={19} />Meu perfil</Link><button className={styles.logout} onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={19} />{logout.isPending ? 'Saindo...' : 'Sair'}</button><div className={styles.profile}><span>{session.user?.nome.slice(0,2).toUpperCase() ?? 'US'}</span><div><strong>{session.user?.nome ?? 'Usuário'}</strong><small>Conta do tenant</small></div><ChevronDown size={15} /></div></div>
      </aside>
      <div className={styles.content}>
        {session.impersonation && <div className={styles.impersonation}><ShieldCheck size={16} /><strong>Acessando como {session.impersonation.tenantName}</strong><span>Sessão administrativa temporária</span><button onClick={() => { sessionStore.clear(); queryClient.clear(); router.replace('/interno/tenants'); }}>Sair da conta do cliente</button></div>}
        <header className={styles.topbar}><button className={styles.menu} onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className={styles.actions}>{actions}<Button variant="ghost" size="icon" aria-label="Notificações" icon={<Bell size={19} />} /><span className={styles.avatar}>PR</span></div></header>
        <main className={`${styles.main} page-enter`}>{children}</main>
      </div>
    </div>
    </AuthGuard>
  );
}
