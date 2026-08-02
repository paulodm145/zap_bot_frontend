import { MessageCircleMore } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 21, letterSpacing: '-.04em' }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--green-600)', color: 'white', boxShadow: '0 8px 20px rgb(18 161 125 / 25%)' }}>
        <MessageCircleMore size={21} strokeWidth={2.4} />
      </span>
      {!compact && <span>zap<span style={{ color: 'var(--green-600)' }}>bot</span></span>}
    </span>
  );
}
