'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
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
/**
 * Alerta flutuante de erro (padrão) ou sucesso (`tone="success"`).
 * `message` mostra um texto pronto (sucesso, ou um erro sem objeto de API);
 * sem `message`, `error` é interpretado (mensagem da API + detalhes/correlação).
 * Use uma `key` diferente por tentativa/mensagem para o alerta reaparecer:
 * `visible` só reseta quando o componente remonta, não quando as props mudam.
 */
export function FeedbackToast({
  error,
  message,
  tone = 'error',
  title,
}: {
  error?: unknown;
  message?: string;
  tone?: 'error' | 'success';
  title?: string;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible || typeof document === 'undefined') return null;
  const resolvedMessage =
    message ?? (error ? (isApiError(error) ? error.message : 'Ocorreu um erro inesperado. Tente novamente.') : null);
  if (!resolvedMessage) return null;
  const details = !message && isApiError(error) ? detailMessage(error.details) : null;
  const success = tone === 'success';
  return createPortal(
    <aside
      className={`${styles.toast} ${success ? styles.success : ''}`}
      role={success ? 'status' : 'alert'}
      aria-live={success ? 'polite' : 'assertive'}
    >
      <span className={styles.icon}>{success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}</span>
      <div>
        <strong>{title ?? (success ? 'Feito' : 'Não foi possível concluir')}</strong>
        <p>{resolvedMessage}</p>
        {details && details !== resolvedMessage && <small>{details}</small>}
        {!message && isApiError(error) && error.correlationId && <code>Referência: {error.correlationId}</code>}
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar aviso">
        <X size={17} />
      </button>
    </aside>,
    document.body,
  );
}
