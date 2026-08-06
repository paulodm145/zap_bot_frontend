'use client';

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import styles from './confirm-dialog.module.css';

/**
 * Confirmação de ação destrutiva. Substitui o `confirm()` nativo, que ignora o
 * design system e não permite exibir o erro da requisição.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Excluir',
  error,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  error?: string | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onCancel, pending]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !pending) onCancel();
  }

  return createPortal(
    <div className={styles.backdrop} role="presentation" onMouseDown={closeFromBackdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className={styles.icon} aria-hidden="true">
          <AlertTriangle size={20} />
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <footer className={styles.footer}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? 'Excluindo...' : confirmLabel}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
