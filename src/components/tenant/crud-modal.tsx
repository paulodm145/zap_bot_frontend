'use client';
import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './tenant.module.css';
export function CrudModal({title,subtitle,children,error,pending,submitLabel='Salvar',onClose,onSubmit}:{title:string;subtitle:string;children:ReactNode;error?:string|null;pending?:boolean;submitLabel?:string;onClose:()=>void;onSubmit:(event:FormEvent)=>void}){return <div className={styles.modalBackdrop} role="presentation"><form className={styles.modalCard} onSubmit={onSubmit}><header className={styles.modalHeader}><div><span>CADASTRO</span><h2>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} disabled={pending} aria-label="Fechar"><X size={19}/></button></header><div className={styles.modalBody}>{children}{error&&<div className={styles.error} role="alert">{error}</div>}</div><footer className={styles.modalFooter}><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button><Button disabled={pending}>{pending?'Salvando...':submitLabel}</Button></footer></form></div>}
