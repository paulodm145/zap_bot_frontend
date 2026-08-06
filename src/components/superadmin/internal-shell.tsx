'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { InternalGuard } from './internal-guard';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';
import styles from './internal-shell.module.css';

const items = [
  { href: '/interno', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/interno/tenants', label: 'Tenants', icon: Building2 },
  { href: '/interno/saude', label: 'Saúde da plataforma', icon: Activity },
];

export function InternalShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function logout() {
    internalSessionStore.clear();
    router.replace('/interno/login');
  }
  return (
    <InternalGuard>
      <div className={styles.shell}>
        {open && <button className={styles.overlay} onClick={() => setOpen(false)} aria-label="Fechar menu" />}
        <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
          <div className={styles.logo}>
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X size={19} />
            </button>
          </div>
          <div className={styles.scope}>
            <ShieldCheck size={17} />
            <div>
              <small>ESCOPO</small>
              <strong>Superadmin interno</strong>
            </div>
          </div>
          <nav>
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? styles.active : ''}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronRight size={14} />
                </Link>
              );
            })}
          </nav>
          <div className={styles.bottom}>
            <Link href="#">
              <Settings size={18} />
              Configurações internas
            </Link>
            <button onClick={logout}>
              <LogOut size={18} />
              Encerrar sessão
            </button>
            <div className={styles.operator}>
              <span>SA</span>
              <div>
                <strong>Operador ZapBot</strong>
                <small>super_admin</small>
              </div>
            </div>
          </div>
        </aside>
        <div className={styles.content}>
          <header className={styles.topbar}>
            <button className={styles.menu} onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu size={21} />
            </button>
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className={styles.actions}>
              {actions}
              <Button variant="ghost" size="icon" aria-label="Notificações" icon={<Bell size={18} />} />
            </div>
          </header>
          <main className={`${styles.main} page-enter`}>{children}</main>
        </div>
      </div>
    </InternalGuard>
  );
}
