'use client';
import styles from './toggle-switch.module.css';

export function ToggleSwitch({ checked, onCheckedChange, disabled = false, label }: { checked:boolean; onCheckedChange:(checked:boolean)=>void; disabled?:boolean; label:string }) {
  return <label className={`${styles.root} ${disabled ? styles.disabled : ''}`} title={label}><input type="checkbox" checked={checked} onChange={event=>onCheckedChange(event.target.checked)} disabled={disabled} aria-label={label}/><span className={styles.track} aria-hidden="true"><span/></span></label>;
}
