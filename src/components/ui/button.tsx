import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
