'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, Bot, ChevronDown, Menu, MessagesSquare, Settings, Users, Workflow, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import styles from './app-shell.module.css';

const nav = [
  { href: '/dashboard', label: 'Visão geral', icon: BarChart3 },
  { href: '/fluxos', label: 'Meus fluxos', icon: Workflow },
  { href: '#', label: 'Atendimento', icon: MessagesSquare },
  { href: '#', label: 'Contatos', icon: Users },
  { href: '#', label: 'Assistentes IA', icon: Bot },
];

export function AppShell({ children, title, subtitle, actions }: { children: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.shell}>
      {open && <button className={styles.overlay} onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.logoRow}><Logo /><button className={styles.close} onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className={styles.workspace}><span>EA</span><div><small>Workspace</small><strong>Empresa Aurora</strong></div><ChevronDown size={15} /></div>
        <nav aria-label="Navegação principal">{nav.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href) && item.href !== '#'; return <Link key={item.label} href={item.href} className={active ? styles.active : ''} onClick={() => setOpen(false)}><Icon size={19} /><span>{item.label}</span>{item.label === 'Atendimento' && <b>8</b>}</Link>; })}</nav>
        <div className={styles.sidebarBottom}><Link href="#"><Settings size={19} />Configurações</Link><div className={styles.profile}><span>PR</span><div><strong>Paulo Roberto</strong><small>Administrador</small></div><ChevronDown size={15} /></div></div>
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}><button className={styles.menu} onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className={styles.actions}>{actions}<Button variant="ghost" size="icon" aria-label="Notificações" icon={<Bell size={19} />} /><span className={styles.avatar}>PR</span></div></header>
        <main className={`${styles.main} page-enter`}>{children}</main>
      </div>
    </div>
  );
}
