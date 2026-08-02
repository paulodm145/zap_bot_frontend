import type { ReactNode } from 'react';
import styles from './ui.module.css';

export function Badge({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'neutral' | 'warning' }) {
  return <span className={`${styles.badge} ${styles[`badge-${tone}`]}`}>{children}</span>;
}
