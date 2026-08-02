import Link from 'next/link';
import { CheckCircle2, GitBranch, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import styles from './auth.module.css';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.shell}>
      <section className={styles.brandPanel}>
        <Link href="/login" aria-label="ZapBot — início"><Logo /></Link>
        <div className={styles.pitch}>
          <span className={styles.eyebrow}>Conversas que trabalham por você</span>
          <h1>Automatize. Conecte. <em>Converta.</em></h1>
          <p>Crie jornadas inteligentes para WhatsApp e acompanhe cada conversa em um só lugar.</p>
          <div className={styles.flowPreview} aria-hidden="true">
            <div className={styles.node}><span><Sparkles size={17} /></span><div><small>Boas-vindas</small><strong>Olá! Como posso ajudar?</strong></div></div>
            <div className={styles.connector} />
            <div className={styles.node}><span><GitBranch size={17} /></span><div><small>Condição</small><strong>Identificar intenção</strong></div></div>
          </div>
          <div className={styles.proof}><CheckCircle2 size={18} /> Configuração simples, sem código</div>
        </div>
        <p className={styles.copyright}>© 2026 ZapBot. Feito para aproximar negócios e pessoas.</p>
      </section>
      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
