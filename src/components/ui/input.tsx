import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; icon?: ReactNode };

export function Input({ label, hint, icon, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className={styles.field} htmlFor={inputId}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrap}>
        {icon}
        <input id={inputId} {...props} />
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
