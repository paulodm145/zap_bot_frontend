'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { isApiError } from '@/lib/api/api-error';
import styles from './feedback-toast.module.css';
function detailMessage(details: unknown): string | null {
  if (Array.isArray(details)) return details.map(detailMessage).filter(Boolean).join(' · ') || null;
  if (!details || typeof details !== 'object') return typeof details === 'string' ? details : null;
  const value = details as Record<string, unknown>;
  if (typeof value.mensagem === 'string')
    return value.campo ? `${String(value.campo)}: ${value.mensagem}` : value.mensagem;
  if (typeof value.message === 'string') return value.path ? `${String(value.path)}: ${value.message}` : value.message;
  return detailMessage(value.erros ?? value.errors ?? Object.values(value));
}
export function FeedbackToast({ error, title = 'Não foi possível concluir' }: { error: unknown; title?: string }) {
  const [visible, setVisible] = useState(true);
  if (!error || !visible || typeof document === 'undefined') return null;
  const message = isApiError(error) ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
  const details = isApiError(error) ? detailMessage(error.details) : null;
  return createPortal(
    <aside className={styles.toast} role="alert" aria-live="assertive">
      <span className={styles.icon}>
        <AlertCircle size={20} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {details && details !== message && <small>{details}</small>}
        {isApiError(error) && error.correlationId && <code>Referência: {error.correlationId}</code>}
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar aviso">
        <X size={17} />
      </button>
    </aside>,
    document.body,
  );
}
