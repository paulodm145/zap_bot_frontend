'use client';

import { useEffect, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import tenantStyles from './tenant.module.css';
import styles from './crud-modal.module.css';

export function CrudModal({ title, subtitle, children, error, pending, submitLabel = 'Salvar', onClose, onSubmit }: { title:string; subtitle:string; children:ReactNode; error?:string|null; pending?:boolean; submitLabel?:string; onClose:()=>void; onSubmit:(event:FormEvent)=>void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape' && !pending) onClose(); }
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [onClose, pending]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !pending) onClose();
  }

  return createPortal(<div className={styles.modal} role="presentation" onMouseDown={closeFromBackdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="crud-modal-title"><form className={styles.content} onSubmit={onSubmit}><header className={styles.header}><div><h2 id="crud-modal-title">{title}</h2><p>{subtitle}</p></div><button type="button" className={styles.close} onClick={onClose} disabled={pending} aria-label="Fechar"><X size={18}/></button></header><div className={`${styles.body} ${tenantStyles.modalBody}`}>{children}{error&&<div className={tenantStyles.error} role="alert">{error}</div>}</div><footer className={styles.footer}><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button><Button disabled={pending}>{pending?'Salvando...':submitLabel}</Button></footer></form></div></div>, document.body);
}
